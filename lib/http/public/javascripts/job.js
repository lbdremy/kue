
/*!
 * q - Job
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Initialize a new `Job` with the given `data`.
 *
 * @param {Object} obj
 */

function Job(data) {
  this.update(data);
}

/**
 * Return the job template html.
 *
 * @return {String}
 */

Job.prototype.template = function(){
  return o('#job-template').html();
};

/**
 * Show progress indicator.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showProgress = function(val){
  this._showProgress = val;
  return this;
};

/**
 * Show error message when `val` is true.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showErrorMessage = function(val){
  this._showError = val;
  return this;
};

/**
 * Remove the job and callback `fn()`.
 * 
 * @param {Function} fn
 */

Job.prototype.remove = function(fn){
  request('DELETE', '/job/' + this.id, fn);
  return this;
};

/**
 * Update the job with the given `data`.
 *
 * @param {Object} data
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.update = function(data){
  for (var key in data) this[key] = data[key];
  if (!this.data) this.data = {};
  return this;
};

/**
 * Render the job, returning an oQuery object.
 *
 * @param {Boolean} isNew
 * @return {oQuery}
 */

Job.prototype.render = function(isNew){
  var self = this
    , id = this.id
    , el = this.el;

  if (isNew) {
    el = this.el = o(this.template());

    // progress indicator
    var canvas = el.find('canvas').get(0) 
      , ctx = this.ctx = canvas.getContext('2d')
      , progress = new Progress;

    progress.size(canvas.width);
    this._progress = progress;

    // populate title and id
    el.id('job-' + id);
    el.find('h2').text(id);

    // remove button
    el.find('.remove').click(function(){
      self.remove(function(){
        el.remove();
      });
    });

    // show details
    el.click(function(){
      console.log('show details');
    });
  }

  this.renderUpdate();

  return el;
};

/**
 * Update the job view.
 */

Job.prototype.renderUpdate = function(){
  var el = this.el
    , showError = this._showError
    , showProgress = this._showProgress;

  // type
  el.find('.type td:last-child').text(this.type);

  // errors
  if (showError && this.error) {
    el.find('.error td:last-child').text(this.error.split('\n')[0]);
  } else {
    el.find('.error').remove();
  }

  // attempts
  if (this.attempts) {
    el.find('.attempts').text(this.attempts);
  } else {
    el.find('.attempts').remove();
  }

  // title
  el.find('.title td:last-child').text(this.data.title
    ? this.data.title
    : 'untitled');

  // timestamps
  // TODO: only in details
  el.find('.created_at').text(relative(Date.now() - this.created_at) + ' ago');
  el.find('.updated_at').text(relative(Date.now() - this.updated_at) + ' ago');
  el.find('.failed_at').text(relative(Date.now() - this.failed_at) + ' ago');
  el.find('.duration').text(relative(this.duration));

  // progress indicator
  if (showProgress) this._progress.update(this.progress).draw(this.ctx);
};