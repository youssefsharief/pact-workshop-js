const { Verifier } = require('@pact-foundation/pact')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const path = require('path')
chai.use(chaiAsPromised)


// Verify that the provider meets all consumer expectations
describe('Pact Verification', () => {
  it('should validate the expectations of Our Little Consumer', function (done) { // lexical binding required here for timeout

    const pactsDirectory = path.resolve(process.cwd(), 'pacts');
    const opts = {
        providerBaseUrl: 'http://localhost:3000',
        provider: 'BackendService',
        pactUrls: [`${pactsDirectory}/our_little_consumer-our_provider.json`],
    };



    // let opts = {
    //   provider: 'Our Provider',
    //   providerBaseUrl: 'http://localhost:3000',
    //   pactUrls: [path.join(process.cwd(), 'pacts')],
    //   // providerStatesSetupUrl: 'http://localhost:3000/setup',
    //   pactBrokerUrl: 'https://test.pact.dius.com.au/pacts/provider/Our%20Provider/consumer/Our%20Little%20Consumer/latest',
    //   tags: ['prod'],
    //   pactBrokerUsername: 'dXfltyFMgNOFZAxr8io9wJ37iUpY42M',
    //   pactBrokerPassword: 'O5AIZWxelWbLvqMd8PkAVycBJh2Psyg1',
    //   publishVerificationResult: true,
    //   providerVersion: '1.0.0'
    // }

    return new Verifier().verifyProvider(opts).then( (x) =>  {
      console.log(x)
      done()
    }).catch(x => console.log(x));
  })
})
