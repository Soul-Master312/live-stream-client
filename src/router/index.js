import Vue from 'vue'
import Router from 'vue-router'
import Dashboard from './dashboard'

Vue.use(Router)
let _ = require('lodash')
let BaseRoute = []

export default new Router({
  routes: _.merge(
    BaseRoute,
    Dashboard
  ),
  mode: 'history'
})
