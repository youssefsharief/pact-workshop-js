const path = require('path')
const chai = require('chai')
const { Pact, Matchers } = require('@pact-foundation/pact')
const { somethingLike: like, eachLike } = Matchers
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const API_PORT = process.env.API_PORT || 9123
const {
  fetchProviderData, getUsers
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



// const date = '2013-08-16T15:31:20+10:00'
const submissionDate = new Date().toISOString()
// const dateRegex = '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}'

describe('Pact with Our Provider', () => {
  before(() => {
    return provider.setup()
  })

  describe('get users', () => {
    describe('when unauthorized', () => {
      before(() => {
        return provider.addInteraction({
          state: 'regular user',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users',
          },
          willRespondWith: {
            status: 403,
          }
        })
      })
      it('can handle unauthorized request', (done) => {
        getUsers().catch(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })

    describe('when manager', () => {
      before(() => {
        return provider.addInteraction({
          state: 'manager',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users',
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: {
              users: eachLike({id: like("sjakdlja"), name: like('asd'), email: like('sajdfkl@jdks.com'), active: like(true)})
            }
          }
        })
      })
      it('return only regular users', (done) => {
        getUsers().then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })


    describe('when admin', () => {
      before(() => {
        return provider.addInteraction({
          state: 'admin',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users',
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: {
              users: eachLike({id: like("sjakdlja"), name: like('asd'), email: like('sajdfkl@jdks.com'), active: like(true), role: like('regular')})
            }
          }
        })
      })
      it('return only regular users', (done) => {
        getUsers().then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })

    describe('when no users', () => {
      before(() => {
        return provider.addInteraction({
          state: 'no users in database',
          uponReceiving: 'a request for users data',
          withRequest: {
            method: 'GET',
            path: '/users',
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
      it('return only regular users', (done) => {
        getUsers().then(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })

  })
  describe('given data count > 0', () => {
    describe('when a call to the Provider is made', () => {
      // describe('and a valid date is provided', () => {
      //   before(() => {
      //     return provider.addInteraction({
      //       state: 'date count > 0',
      //       uponReceiving: 'a request for JSON data',
      //       withRequest: {
      //         method: 'GET',
      //         path: '/provider',
      //         query: { validDate: submissionDate }
      //       },
      //       willRespondWith: {
      //         status: 200,
      //         headers: {
      //           'Content-Type': 'application/json; charset=utf-8'
      //         },
      //         body: {
      //           test: 'NO',
      //           validDate: term({ generate: date, matcher: dateRegex }),
      //           count: like(1000)
      //         }
      //       }
      //     })
      //   })

      //   it('can process the JSON payload from the provider', done => {
      //     const response = fetchProviderData(submissionDate)

      //     expect(response).to.eventually.have.property('count', 100)
      //     expect(response).to.eventually.have.property('date', date).notify(done)
      //   })

      //   it('should validate the interactions and create a contract', () => {
      //     return provider.verify()
      //   })
      // })

      describe('and an invalid date is provided', () => {
        before(() => {
          return provider.addInteraction({
            state: 'date count > 0',
            uponReceiving: 'a request with an invalid date parameter',
            withRequest: {
              method: 'GET',
              path: '/provider',
              query: {
                validDate: 'This is not a date'
              }
            },
            willRespondWith: {
              status: 400,
              headers: {
                'Content-Type': 'application/json; charset=utf-8'
              },
              body: { 'error': '\'This is not a date\' is not a date' }
            }
          })
        })

        it('can handle an invalid date parameter', (done) => {
          expect(fetchProviderData('This is not a date')).to.eventually.be.rejectedWith(Error).notify(done)
        })

        it('should validate the interactions and create a contract', () => {
          return provider.verify()
        })
      })

      describe('and no date is provided', () => {
        before(() => {
          return provider.addInteraction({
            state: 'date count > 0',
            uponReceiving: 'a request with a missing date parameter',
            withRequest: {
              method: 'GET',
              path: '/provider',
            },
            willRespondWith: {
              status: 400,
              headers: {
                'Content-Type': 'application/json; charset=utf-8'
              },
              body: { 'error': 'validDate is required' }
            }
          })
        })

        it('can handle missing date parameter', (done) => {
          expect(fetchProviderData(null)).to.eventually.be.rejectedWith(Error).notify(done)
        })

        it('should validate the interactions and create a contract', () => {
          return provider.verify()
        })
      })
    })
  })

  describe('given data count == 0', () => {
    describe('when a call to the Provider is made', () => {
      describe('and a valid date is provided', () => {
        before(() => {
          return provider.addInteraction({
            state: 'date count == 0',
            uponReceiving: 'a request for JSON data',
            withRequest: {
              method: 'GET',
              path: '/provider',
              query: { validDate: submissionDate }
            },
            willRespondWith: {
              status: 404,
              headers: {
                'Content-Type': 'application/json; charset=utf-8'
              }
            }
          })
        })

        it('can handle missing data', (done) => {
          expect(fetchProviderData(submissionDate)).to.eventually.be.rejectedWith(Error).notify(done)
        })

        it('should validate the interactions and create a contract', () => {
          return provider.verify()
        })
      })
    })
  })

  // Write pact files to file
  after(() => {
    return provider.finalize()
  })
})
