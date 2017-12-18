import Ember from 'ember';
import { searchQuery } from '../utils/serialize';
import ENV from '../config/environment';

const API_VERSION = 'v1';

export function send(type, route, data) {
  if (type === 'GET' && !!data) {
    route += searchQuery(data);
  }
  return new Ember.RSVP.Promise((resolve, reject) => {
    Ember.$.ajax({
      type,
      url: ENV.appURL + route,
      data,
      crossDomain: true,
      xhrFields: {
        withCredentials: true
      },
      dataType: 'json',
      success: Ember.run.bind(null, resolve),
      error: Ember.run.bind(null, reject)
    });
  });
}

export function api(type, route, data) {
  return send(type, `/api/${API_VERSION}${route}`, data);
}

export default {
  api,
  send
};
