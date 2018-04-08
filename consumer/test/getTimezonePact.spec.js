const path = require('path')
const chai = require('chai')
const { Pact, Matchers } = require('@pact-foundation/pact')
const { somethingLike: like } = Matchers
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const API_PORT = process.env.API_PORT || 9123
const {
  getTimezone
} = require('../client')
chai.use(chaiAsPromised)

// Configure and import consumer API
// Note that we update the API endpoint to point at the Mock Service
const LOG_LEVEL = process.env.LOG_LEVEL || 'WARN'


const provider = new Pact({
  consumer: 'Our Little Consumer',
  provider: 'Our Provider',
  port: API_PORT,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: LOG_LEVEL,
  spec: 2
})


describe('Pact with Our Provider', () => {
  before(() => {
    return provider.setup()
  })

  describe('get timezone', () => {
    describe('when not available', () => {
      before(() => {
        return provider.addInteraction({
          state: 'no',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users/123/timezones/321',
          },
          willRespondWith: {
            status: 404,
          }
        })
      })
      it('return null', (done) => {
        getTimezone(123, 321).catch(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })


    describe('when is avaialabe', () => {
      before(() => {
        return provider.addInteraction({
          state: 'yes',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users/123/timezones/321',
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: {
              timezones: like({ id: like("sjakdlja"), gmtTimeDifference: like('asd'), city: like('Cairo'), name: like('Cairo') })
            }
          }
        })
      })
      it('return timezones', (done) => {
        getTimezone(123, 321).then(() => {
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

