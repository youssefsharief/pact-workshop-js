# Example JS project for the Pact workshop

This project has 2 components, a consumer project and a service provider as an Express API.

## Step 1 - Simple Consumer calling Provider

Given we have a client that needs to make a HTTP GET request to a provider service, and requires a response in JSON format.

The consumer client is quite simple and looks like this

*consumer/consumer.js:*

```js
request
  .get(`${API_ENDPOINT}/provider`)
  .query({validDate: new Date().toISOString()})
  .then((res) => {
    console.log(res.body)
  })
```

and the express provider resource

*provider/provider.js:*

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

*consumer/client.js:*

```js
const fetchProviderData = () => {
  return request
    .get(`${API_ENDPOINT}/provider`)
    .query({validDate: new Date().toISOString()})
    .then((res) => {
      return {
        value: 100 / res.body.count,
        date: res.body.date
      }
    })
}
```

The consumer is now a lot simpler:

*consumer/consumer.js:*

```js
const client = require('./client')

client.fetchProviderData().then(response => console.log(response))
```

Let's now test our updated client.

*consumer/test/consumer.spec.js:*

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

*consumer/test/consumerPact.spec.js:*

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

# Step 4 - Verify the provider

We now need to validate the pact generated by the consumer is valid, by executing it against the running service provider, which should fail:

```console
npm run test:pact:provider

> pact-workshop-js@1.0.0 test:pact:provider /Users/mfellows/development/public/pact-workshop-js
> mocha provider/test/providerPact.spec.js



Provider Service listening on http://localhost:8081
  Pact Verification
    1) should validate the expectations of Our Little Consumer


  0 passing (538ms)
  1 failing

  1) Pact Verification should validate the expectations of Our Little Consumer:
     Error: Reading pact at pacts/our_little_consumer-our_provider.json

Verifying a pact between Our Little Consumer and Our Provider
  A request for json data
    with GET /provider?validDate=2017-06-12T08%3A29%3A09.261Z
      returns a response which
        has status code 200
        has a matching body (FAILED - 1)
        includes headers
          "Content-Type" with value "application/json; charset=utf-8"

Failures:

  1) Verifying a pact between Our Little Consumer and Our Provider A request for json data with GET /provider?validDate=2017-06-12T08%3A29%3A09.261Z returns a response which has a matching body
     Failure/Error: expect(response_body).to match_term expected_response_body, diff_options

       Actual: {"test":"NO","validDate":"2017-06-12T08:31:42.460Z","count":100}

       @@ -1,4 +1,3 @@
        {
       -  "date": "2013-08-16T15:31:20+10:00",
       -  "count": 1000
       +  "count": 100
        }

       Key: - means "expected, but was not found".
            + means "actual, should not be found".
            Values where the expected matches the actual are not shown.

1 interaction, 1 failure
```

The test has failed for 2 reasons. Firstly, the count field has a different value to what was expected by the consumer.

Secondly, and more importantly, the consumer was expecting a `date` field while the provider generates a `validDate` field. Also, the date formats are different.

# Step 5

Intentionally blank to align with the [JVM workshop](https://github.com/DiUS/pact-workshop-jvm/) steps

## Step 6 - Back to the client we go

Let's correct the consumer test to handle any integer for `count` and use the correct field for the `date`. Then we need to add a type matcher for `count` and change the field for the date to be `validDate`.

We can also add a date regular expression to make sure the `validDate` field is a valid date. This is important because we are parsing it.

The updated consumer test is now:

```js
const { somethingLike: like, term } = pact.Matchers

describe('Pact with Our Provider', () => {
  describe('given data count > 0', () => {
    describe('when a call to the Provider is made', () => {
      before(() => {
        return provider.setup()
          .then(() => {
            provider.addInteraction({
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
                body: {
                  test: 'NO',
                  validDate: term({generate: date, matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+\\d{2}:\\d{2}'}),
                  count: like(100)
                }
              }
            })
          })
      })
...
})
```

Running this test will fail until we fix the client. Here is the correct client function, which parses the date and formats it correctly:

```js
const fetchProviderData = (submissionDate) => {
  return request
    .get(`${API_ENDPOINT}/provider`)
    .query({validDate: submissionDate})
    .then((res) => {
      // Validate date
      if (res.body.validDate.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/)) {
        return {
          count: res.body.count,
          date: moment(res.body.validDate, moment.ISO_8601).format('YYYY-MM-DDTHH:mm:ssZ')
        }
      } else {
        throw new Error('Invalid date format in response')
      }
    })
}
```

Now the test passes. But we still have a problem with the date format, which we must fix in the provider. Running the client now fails because of that.

```console
$ node consumer/consumer.js
Error: Invalid date format in response
    at request.get.query.then (consumer/client.js:20:15)
    at process._tickCallback (internal/process/next_tick.js:103:7)
```

## Step 7 - Verify the providers again

We need to run 'npm run test:pact:consumer' to publish the consumer pact file again. Then, running the provider verification tests we get the expected failure about the date format.

```
Failures:

...

@@ -1,4 +1,4 @@
{
-  "validDate": /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/
+  "validDate": "2017-06-12T10:28:12.904Z"
}
```

_NOTE_: There is currently a [bug](https://github.com/realestate-com-au/pact/issues/141) in the Ruby implementation under the hood that makes this error message unhelpful - we're working on it!

Lets fix the provider and then re-run the verification tests. Here is the corrected `/provider` resource:

```js
server.get('/provider', (req, res) => {
  const date = req.query.validDate

  res.json(
    {
      'test': 'NO',
      'validDate': moment(new Date(), moment.ISO_8601).format('YYYY-MM-DDTHH:mm:ssZ'),
      'count': 100
    }
  )
})
```

Running the verification against the providers now pass. Yay!

```console
$ npm run test:pact:provider

> pact-workshop-js@1.0.0 test:pact:provider /Users/mfellows/development/public/pact-workshop-js
> mocha provider/test/providerPact.spec.js



Animal Profile Service listening on http://localhost:8081
  Pact Verification
Pact Verification Complete!
Reading pact at pacts/our_little_consumer-our_provider.json

Verifying a pact between Our Little Consumer and Our Provider
  A request for json data
    with GET /provider?validDate=2017-06-12T10%3A39%3A01.793Z
      returns a response which
        has status code 200
        has a matching body
        includes headers
          "Content-Type" with value "application/json; charset=utf-8"

1 interaction, 0 failures



    ✓ should validate the expectations of Our Little Consumer (498ms)


  1 passing (503ms)
```

Our consumer also now works:

```console
$ node consumer/consumer.js
{ count: 100, date: '2017-06-12T20:40:51+10:00' }
```
