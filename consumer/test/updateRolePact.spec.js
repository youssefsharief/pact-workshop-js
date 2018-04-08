const path = require('path')
const chai = require('chai')
const { Pact } = require('@pact-foundation/pact')
const chaiAsPromised = require('chai-as-promised')
const API_PORT = process.env.API_PORT || 9123
const {
  updateRole
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
  describe('updateRole', () => {
    describe('success as admin', () => {
        before(() => {
          return provider.addInteraction({
            state: 'admin',
            uponReceiving: 'admin',
            withRequest: {
              method: 'PATCH',
              path: '/users/123/role',
              body: {
                role: 'regular',
              }
            },
            willRespondWith: {
              status: 200,
            }
          })
        })
        it('return success', (done) => {
          updateRole(123, 'regular').then(() => {
            done()
          }).catch(()=> done());
        })
        it('should validate the interactions and create a contract', () => {
          return provider.verify()
        })
      })


    describe('when admin but user not available', () => {
      before(() => {
        return provider.addInteraction({
          state: 'admin but user is not available',
          uponReceiving: 'admin but user not available',
          withRequest: {
            method: 'PATCH',
            path: '/users/123/role',
            body: {
              role: 'regular',
            }
          },
          willRespondWith: {
            status: 404,
          }
        })
      })
      it('return null', (done) => {
        updateRole(123, 'regular').catch(() => {
          done()
        });
      })
      it('should validate the interactions and create a contract', () => {
        return provider.verify()
      })
    })

    describe('when admin but id wrong', () => {
        before(() => {
          return provider.addInteraction({
            state: 'wrong id',
            uponReceiving: 'wrong id',
            withRequest: {
              method: 'PATCH',
              path: '/users/123/role',
              body: {
                role: 'regular',
              }
            },
            willRespondWith: {
              status: 422,
            }
          })
        })
        it('return null', (done) => {
          updateRole(123, 'regular').catch(() => {
            done()
          });
        })
        it('should validate the interactions and create a contract', () => {
          return provider.verify()
        })
      })


    describe('when admin but role is not among enum', () => {
        before(() => {
          return provider.addInteraction({
            state: 'wrong role type',
            uponReceiving: 'admin but role is not among enum',
            withRequest: {
              method: 'PATCH',
              path: '/users/123/role',
              body: {
                role: 'ay7aga',
              }
            },
            willRespondWith: {
              status: 422,
            }
          })
        })
        it('return null', (done) => {
          updateRole(123, 'ay7aga').catch(() => {
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

