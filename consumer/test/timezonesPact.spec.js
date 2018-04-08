const chai = require('chai')
const path = require('path')
const chaiAsPromised = require('chai-as-promised')
const pact = require('pact')
const expect = chai.expect
const API_PORT = process.env.API_PORT || 9123
const {
  getTimezones
} = require('../client')
chai.use(chaiAsPromised)

// Configure and import consumer API
// Note that we update the API endpoint to point at the Mock Service
const LOG_LEVEL = process.env.LOG_LEVEL || 'WARN'

const provider = pact({
  consumer: 'Our Little Consumer',
  provider: 'Our Provider',
  port: API_PORT,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: LOG_LEVEL,
  spec: 2
})


// Alias flexible matchers for simplicity
const { somethingLike: like, term, eachLike } = pact.Matchers

describe('Pact with Our Provider', () => {
  before(() => {
    return provider.setup()
  })

  describe('get timezones', () => {
    describe('when no timezones', () => {
      before(() => {
        return provider.addInteraction({
          state: 'no',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users/123/timezones',
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: null
          }
        })
      })
      it('return null', (done) => {
        getTimezones(123).then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })


    describe('when timezones are available', () => {
      before(() => {
        return provider.addInteraction({
          state: 'yes',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users/123/timezones',
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: {
              timezones: eachLike({ id: like("sjakdlja"), gmtTimeDifference: like('asd'), city: like('Cairo'), name: like('Cairo') })
            }
          }
        })
      })
      it('return timezones', (done) => {
        getTimezones(123).then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })

    describe('when not authorized', () => {
      before(() => {
        return provider.addInteraction({
          state: 'not authorized',
          uponReceiving: 'a request for timezones from an unauthorized role',
          withRequest: {
            method: 'GET',
            path: '/users/123/timezones',
          },
          willRespondWith: {
            status: 403,
          }
        })
      })
      it('return timezones', (done) => {
        getTimezones(123).catch(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })


    // Write pact files to file
    after(() => {
      return provider.finalize()
    })
  })
})

