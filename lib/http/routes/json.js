
/*!
 * kue - http - routes - json
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue = require('../../kue')
  , Job = require('../../queue/job')
  , reds = require('reds')
  , queue = new Queue;

/**
 * Search instance.
 */

var search;
function getSearch() {
  if (search) return search;
  reds.createClient = require('../../redis').createClient;
  return search = reds.createSearch('q:search');
};

/**
 * Get statistics including:
 * 
 *   - inactive count
 *   - active count
 *   - complete count
 *   - failed count
 *   - delayed count
 *
 */

exports.stats = function(req, res){
  get(queue)
    ('inactiveCount')
    ('completeCount')
    ('activeCount')
    ('failedCount')
    ('delayedCount')
    ('workTime')
    (function(err, obj){
      if (err) return res.send({ error: err.message });
      res.send(obj);
    });
};

/**
 * Get job types.
 */

exports.types = function(req, res){
  queue.types(function(err, types){
    if (err) return res.send({ error: err.message });
    res.send(types);
  });
};

/**
 * Get jobs by range :from..:to.
 */

exports.jobRange = function(req, res){
  var state = req.params.state
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.range(from, to, order, function(err, jobs){
    if (err) return res.send({ error: err.message });
    res.send(jobs);
  });
};

/**
 * Get jobs by :state, and range :from..:to.
 */

exports.jobStateRange = function(req, res){
  var state = req.params.state
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.rangeByState(state, from, to, order, function(err, jobs){
    if (err) return res.send({ error: err.message });
    res.send(jobs);
  });
};

/**
 * Get jobs by :type, :state, and range :from..:to.
 */

exports.jobTypeRange = function(req, res){
  var type = req.params.type
    , state = req.params.state
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.rangeByType(type, state, from, to, order, function(err, jobs){
    if (err) return res.send({ error: err.message });
    res.send(jobs);
  });
};

/**
 * Get job by :id.
 */

exports.job = function(req, res){
  var id = req.params.id;
  Job.get(id, function(err, job){
    if (err) return res.send({ error: err.message });
    res.send(job);
  });
};

/**
 * Remove job :id.
 */

exports.remove = function(req, res){
  var id = req.params.id;
  Job.remove(id, function(err){
    if (err) return res.send({ error: err.message });
    res.send({ message: 'job ' + id + ' removed' });
  });
};

/**
 * Update job :id :priority.
 */

exports.updatePriority = function(req, res){
  var id = req.params.id
    , priority = parseInt(req.params.priority, 10);

  if (isNaN(priority)) return res.send({ error: 'invalid priority' });
  Job.get(id, function(err, job){
    if (err) return res.send({ error: err.message });
    job.priority(priority);
    job.save(function(err){
      if (err) return res.send({ error: err.message });
      res.send({ message: 'updated priority' });
    });
  });
};

/**
 * Update job :id :state.
 */

exports.updateState = function(req, res){
  var id = req.params.id
    , state = req.params.state;

  Job.get(id, function(err, job){
    if (err) return res.send({ error: err.message });
    job.state(state);
    job.save(function(err){
      if (err) return res.send({ error: err.message });
      res.send({ message: 'updated state' });
    });
  });
};

/**
 * Search and respond with ids.
 */

exports.search = function(req, res){
  getSearch().query(req.query.q, function(err, ids){
    if (err) return res.send({ error: err.message });
    res.send(ids);
  });
};

/**
 * Get log for job :id.
 */

exports.log = function(req, res){
  var id = req.params.id;
  Job.log(id, function(err, log){
    if (err) return res.send({ error: err.message });
    res.send(log);
  });
};

/**
 * Create a new job 
 */

exports.create = function(req,res){
  var type = req.body.type;
  var data = req.body.data || {};
  var options = req.body.options;
  if(!type) return res.send({error : 'creation of a job required a type.'},400);
  var job = new Job(type,data);
  if(options.attempts) job.attempts(options.attempts);
  if(options.priority) job.priority(options.priority);
  if(options.delay) job.delay(options.delay);
  job.save(function(err){
    if(err) return res.send({ error : err.message },500);
    res.send({ message : 'job ' + job.id + ' created'});
  });
}

/**
 * Create a list of jobs
 */

exports.createJobs = function(req,res){
  if(!Array.isArray(req.body)) return res.send({ error : 'expecting an array of jobs'},400);
  for(var i =0; i < req.body.length; i++){
    if(!req.body[i].type) return res.send({ error : 'creation of a job required a type.'},400);
  }
  var errors = [];
  var savedJobs = 0;
  var jobs = [];
  for(var i=0; i <req.body.length;i++){
    var type = req.body[i].type;
    var data = req.body[i].data || {};
    var options = req.body[i].options;
    var job = new Job(type,data);
    jobs.push(job);
    if(options.attempts) job.attempts(options.attempts);
    if(options.priority) job.priority(options.priority);
    if(options.delay) job.delay(options.delay);
    job.save(function(err){
      ++savedJobs;
      if(err) errors.push(err);
      if(savedJobs === jobs.length){
        if(errors.length !== 0) return res.send({ error : (errors.map(function(err){return err.message})) },500);
          res.send({ message : 'jobs ' + jobs.map(function(job){return job.id }).join(', ') + ' created'});
      }
    });
  };
}

/**
 * Data fetching helper.
 */

function get(obj) {
  var pending = 0
    , res = {}
    , callback
    , done;

  return function _(arg){
    switch (typeof arg) {
      case 'function':
        callback = arg;
        break;
      case 'string':
        ++pending;
        obj[arg](function(err, val){
          if (done) return;
          if (err) return done = true, callback(err);
          res[arg] = val;
          --pending || callback(null, res);
        });
        break;
    }
    return _;
  };
}
