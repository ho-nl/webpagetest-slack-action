# WebPageTest Slack Action

WebPageTest's Slack Action lets you automatically run tests against WebPageTest. 
You can set and enforce performance budgets, and have performance data automatically added to your Slack channel.

**Features:**
- Automatically run WebPageTest against code changes
- Set and enforce budgets for any metric WebPageTest can surface (spoiler alert: there are a lot)
- Complete control over WebPageTest test settings (authentication, custom metrics, scripting, etc)

## Building the Action

Follow the instrictions found here: https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github

## Using the Action

1. Create a `.github/workflows/frontend-performance.yml` file in your repository with the following settings:

```yml
name: Frontend performance tests

on:
  repository_dispatch:
    types: [frontend-performance-test]

jobs:
  frontend-performance-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v1
      - name: Mobile tests
        uses: timhofman/webpagetest-github-action@main
        id: run-wpt-mobile
        with:
          apiKey: ${{ secrets.WPT_API_KEY }}
          urls: |
            https://www.paracord.nl/
            https://www.paracord.nl/paracord
          label: 'Paracord mobile tests'
          budget: 'wpt-budget-mobile.json'
          wptOptions: 'wpt-options-mobile.json'
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Send Slack Message
        uses: archive/github-actions-slack@v2.0.0
        id: send-message

        with:
          slack-function: send-message
          slack-bot-user-oauth-access-token: ${{ secrets.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN }}
          slack-channel: speedcurve-demo
          slack-text: "${{ steps.run-wpt-mobile.outputs.results }}"
```
2. Secrets 
   
The WPT_API_KEY and GITHUB_TOKEN are secrets on the organization level, so you don't need to add anything to your repository.

3. Slack configuration
Use the 'slack-channel' property to define to which channel the report needs to be posted.
   
You also need to invite the bot/app 'WebPageTest' to your channel.

3. Budget and options files 

Use the wptOptions to customize how you want to run the tests.
```json
{
  "runs": 1,
  "location": "gce-europe-west4:Chrome;iPhone6",
  "connectivity": "3G",
  "emulateMobile": true
}
```

You can also set budgets for a test. See 'budget' in the example.
A test will be marked in Slack when it exceeds the provided budgets
```json
{
  "median": {
    "firstView": {
      "chromeUserTiming.CumulativeLayoutShift": 0.1,
      "chromeUserTiming.LargestContentfulPaint": 2500,
      "TotalBlockingTime": 300
    }
  }
}
```

4. Trigger manually or from Jenkins pipeline 
   
The action is triggered by the repository_dispatch event.
Our development pipeline is not (yet) fully running on Github Actions, the below
snippet can be used to manually trigger the event. You can also add the snippet as a separate build step 'execute shell'

The token can be found in 1Pass under 'WebPageTest Github Token'
```
curl --request POST \
--url 'https://api.github.com/repos/ho-nl/<your_repos>/dispatches' \
    --header 'authorization: Bearer <github_token>' \
      --data '{"event_type": "frontend-performance-test"}'
```

5. Run mobile and desktop tests
You can run separate tests for mobile and desktop by duplicating the steps in your action file and provide it with separate budget and options files.

