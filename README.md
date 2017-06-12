# Example JS project for the Pact workshop

This project has 2 components, a consumer project and a service provider as an Express API.

## Step 1 - Simple Consumer calling Provider

Given we have a client that needs to make a HTTP GET request to a provider service, and requires a response in JSON format.

The consumer client is quite simple and looks like this

*/Users/mfellows/development/public/pact-workshop-js/consumer/consumer.js:*

```js
request
  .get(`${API_ENDPOINT}/provider`)
  .query({validDate: new Date().toISOString()})
  .then((res) => {
    console.log(res.body)
  })
```

and the express provider resource

*/Users/mfellows/development/public/pact-workshop-js/provider/provider.js:*

```js
server.get('/provider/:', (req, res) => {
  const date = req.query.validDate

  res.json(
    {
      'test': 'NO',
      'validDate': new Date().toISOString(),
      'count': 100
    }
  )
})
```

This providers expects a `validDate` parameter in HTTP date format, and then return some simple json back.

Start the provider in a separate terminal:

```
$ node provider/provider.js
Provider Service listening on http://localhost:8080
```

Running the client works nicely.

```
$ node consumer/consumer.js
{ test: 'NO', validDate: '2017-06-12T06:25:42.392Z', count: 100 }
```


## Step 2 - Client Tested but integration fails

Now lets separate the API client (collaborator) that uses the data it gets back from the provider into its own module. Here is the updated client method that uses the returned data:

*/Users/mfellows/development/public/pact-workshop-js/consumer/client.js:*

```js
const fetchProviderData = () => {
  return request
    .get(`${API_ENDPOINT}/provider`)
    .query({validDate: new Date().toISOString()})
    .then((res) => {
      return {
        count: res.body.count,
        date: res.body.date
      }
    })
}
```

The consumer is now a lot simpler:

*/Users/mfellows/development/public/pact-workshop-js/consumer/consumer.js:*

```js
const client = require('./client')

client.fetchProviderData().then(response => console.log(response))
```

Let's now test our updated client.

*/Users/mfellows/development/public/pact-workshop-js/consumer/test/consumer.spec.js:*

```js
describe('Consumer', () => {
  describe('when a call to the Provider is made', () => {
    const date = '2013-08-16T15:31:20+10:00'
    nock(API_HOST)
      .get('/provider')
      .query({validDate: /.*/})
      .reply(200, {
        test: 'NO',
        date: date,
        count: 1000
      })

    it('can process the JSON payload from the provider', done => {
      const {fetchProviderData} = require('../consumer')
      const response = fetchProviderData()

      expect(response).to.eventually.have.property('count', 1000)
      expect(response).to.eventually.have.property('date', date).notify(done)
    })
  })
})
```

Let's run this spec and see it all pass:

```
$ npm run test:consumer

> pact-workshop-js@1.0.0 test:consumer /Users/mfellows/development/public/pact-workshop-js
> mocha consumer/test/consumer.spec.js



  Consumer
    when a call to the Provider is made
      ✓ can process the JSON payload from the provider


  1 passing (24ms)

```

However, there is a problem with this integration point. Running the actual client against any of the providers results in problem!

```
$ node consumer/consumer.js
{ count: 100, date: undefined }
```

The provider returns a `validDate` while the consumer is
trying to use `date`, which will blow up when run for real even with the tests all passing. Here is where Pact comes in.

## Step 3 - Pact to the rescue

Let us add Pact to the project and write a consumer pact test.

*/Users/mfellows/development/public/pact-workshop-js/consumer/test/consumerPact.spec.js:*

```js
const provider = pact({
  consumer: 'Our Little Consumer',
  provider: 'Our Provider',
  port: API_PORT,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: LOG_LEVEL,
  spec: 2
})
const submissionDate = new Date().toISOString()
const date = '2013-08-16T15:31:20+10:00'
const expectedBody = {
  test: 'NO',
  date: date,
  count: 1000
}

describe('Pact with Our Provider', () => {
  describe('given data count > 0', () => {
    describe('when a call to the Provider is made', () => {
      before(() => {
        return provider.setup()
          .then(() => {
            provider.addInteraction({
              state: 'data count > 0',
              uponReceiving: 'a request for JSON data',
              withRequest: {
                method: 'GET',
                path: '/provider',
                query: {
                  validDate: submissionDate
                }
              },
              willRespondWith: {
                status: 200,
                headers: {
                  'Content-Type': 'application/json; charset=utf-8'
                },
                body: expectedBody
              }
            })
          })
      })

      it('can process the JSON payload from the provider', done => {
        const response = fetchProviderData(submissionDate)

        expect(response).to.eventually.have.property('count', 1000)
        expect(response).to.eventually.have.property('date', date).notify(done)
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
```

This test starts a mock server on port 1234 that pretends to be our provider. To get this to work we needed to update
our consumer to pass in the URL of the provider. We also updated the `fetchAndProcessData` method to pass in the
query parameter.

Running this spec still passes, but it creates a pact file which we can use to validate our assumptions on the provider side.

```console
$ npm run "test:pact:consumer"

> pact-workshop-js@1.0.0 test:pact:consumer /Users/mfellows/development/public/pact-workshop-js
> mocha consumer/test/consumerPact.spec.js

  Pact with Our Provider
    when a call to the Provider is made
      when data count > 0
        ✓ can process the JSON payload from the provider
        ✓ should validate the interactions and create a contract


  2 passing (571ms)

```

Generated pact file (*pacts/our_little_consumer-our_provider.json*):

```json
{
  "consumer": {
    "name": "Our Little Consumer"
  },
  "provider": {
    "name": "Our Provider"
  },
  "interactions": [
    {
      "description": "a request for JSON data",
      "providerState": "data count > 0",
      "request": {
        "method": "GET",
        "path": "/provider",
        "query": "validDate=2017-06-12T08%3A04%3A24.387Z"
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json; charset=utf-8"
        },
        "body": {
          "test": "NO",
          "date": "2013-08-16T15:31:20+10:00",
          "count": 1000
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "2.0.0"
    }
  }
}
```
