const request = require('superagent')
const API_HOST = process.env.API_HOST || 'http://localhost'
const API_PORT = process.env.API_PORT || 9123
const moment = require('moment')
const API_ENDPOINT = `${API_HOST}:${API_PORT}`

// Fetch provider data
const fetchProviderData = (submissionDate) => {
  let withDate = {}
  const dateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/

  if (submissionDate) {
    withDate = { validDate: submissionDate }
  }

  return request
    .get(`${API_ENDPOINT}/provider`)
    .query(withDate)
    .then((res) => {
      if (res.body.validDate.match(dateRegex)) {
        return {
          count: 100 / res.body.count,
          date: moment(res.body.validDate, moment.ISO_8601).format('YYYY-MM-DDTHH:mm:ssZ')
        }
      } else {
        throw new Error('Invalid date format in response')
      }
    }, (err) => {
      throw new Error(`Error from response: ${err.body}`)
    })
}

const getUsers = () => request
.get(`${API_ENDPOINT}/users`)
.then((res) => {
  return 1 + res
}, (err) => {
  throw new Error(`Error from response: ${err.body}`)
})

const getTimezones = (userID) => request
.get(`${API_ENDPOINT}/users/${userID}/timezones`)
.then((res) => {
  return 1 + res
}, (err) => {
  throw new Error(`Error from response: ${err.body}`)
})


const getTimezone = (userID, timezoneID) => request
.get(`${API_ENDPOINT}/users/${userID}/timezones/${timezoneID}`)
.then((res) => {
  return 1 + res
}, (err) => {
  throw new Error(`Error from response: ${err.body}`)
})


const signup = ({email, password, name}) => request
.post(`${API_ENDPOINT}/users`).send({ email, password, name })
.then((res) => {
  return 1 + res
}, (err) => {
  throw new Error(`Error from response: ${err.body}`)
})

const updateRole = (userID, role) => request
.patch(`${API_ENDPOINT}/users/${userID}/role`).send({ role })
.then((res) => {
  return 1 + res
}, (err) => {
  throw new Error(`Error from response: ${err.body}`)
})


module.exports = {
  fetchProviderData, getUsers, getTimezones, getTimezone, signup, updateRole
}
