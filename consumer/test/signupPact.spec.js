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

  describe('signup', () => {
    describe('when successfull', () => {
      before(() => {
        return provider.addInteraction({
          state: 'successfull signup',
          uponReceiving: 'a request for signup',
          withRequest: {
            method: 'POST',
            path: '/users',
            body: {
              name: like('Ykdlf'),
              email: like('asda@jdkls.com'),
              password: like('3879544fsldfj')
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: {
              "__v": 0,
              "name": like("Esss"),
              "email": like("e@test.com"),
              "_id": like("5ac99bf9fb44c32c104fc4e3"),
              "timeZones": [],
              "role": like("regular")
            }
          }
        })
      })
      it('return null', (done) => {
        signup({email: 'asda@jdkls.com', password: "sdfkjadjfu8745", name: "jdsfkj"}).then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })


    describe('wrong format', () => {
      before(() => {
        return provider.addInteraction({
          state: 'wrong format',
          uponReceiving: 'wrong format',
          withRequest: {
            method: 'POST',
            path: '/users',
            body: {
              name: like('Ykdlf'),
              email: like('asda@jdkls.com'),
              password: like('38795')
            }
          },
          willRespondWith: {
            status: 422,
          }
        })
      })
      it('return null', (done) => {
        signup({email: 'asda@jdkls.com', password: "sdfkjadjfu8745", name: "jdsfkj"}).catch(() => {
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

