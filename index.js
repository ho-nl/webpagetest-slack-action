const WebPageTest = require("webpagetest");
const core = require("@actions/core");
const github = require('@actions/github');
const ejs = require('ejs');
const { cornflowerblue } = require("color-name");
const { keyword } = require("color-convert");

const WPT_BUDGET = core.getInput('budget');
const WPT_OPTIONS = core.getInput('wptOptions');
const WPT_API_KEY = core.getInput('apiKey');
const WPT_URLS = core.getInput('urls').split("\n");
const WPT_LABEL = core.getInput('label');
const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
const DIRECTORY = process.env.GITHUB_WORKSPACE;
const GH_EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const METRICS = {
    "TTFB": "Time to First Byte",
    "firstContentfulPaint": "First Contentful Paint",
    "TotalBlockingTime": "Total Blocking Time",
    "chromeUserTiming.LargestContentfulPaint": "Largest Contentful Paint",
    "chromeUserTiming.CumulativeLayoutShift": "Cumulative Layout Shift",
}

const runTest = (wpt, url, options) => {
    // clone options object to avoid WPT wrapper issue
    let tempOptions = JSON.parse(JSON.stringify(options));

    return new Promise((resolve, reject) => {
        core.info(`Submitting test for ${url} ...`);
        wpt.runTest(url, tempOptions, async(err, result) => {
            try {
                if (result) {
                    core.debug(result);
                    return resolve({'result':result,'err':err});
                } else {
                    return reject(err);
                }
            } catch (e) {
                core.info(e);
            }
        })
    });
}

const retrieveResults = (wpt, testId) => {
    return new Promise((resolve, reject) => {
        wpt.getTestResults(testId, (err, data) => {
            if (data) {
                return resolve(data);
            } else {
                return reject(err);
            }
        });
    });
}
async function renderComment(data) {
    try {
        let overBudget = false
        data["tests"] = data["tests"].map((test, index) => {
            if (test.budgetsExceeded) {
                overBudget = true
                return test
            }
        })
        if (!overBudget) {
            core.info('No over budget tests')
            return
        }
        let markdown = await ejs.renderFile(`${__dirname}/templates/comment.md`, data);
        markdown
            .replace(/\%/g, '%25')
            .replace(/\n/g, '%0A')
            .replace(/\r/g, '%0D')

        if (GH_EVENT_NAME == 'pull_request') {
            const octokit = github.getOctokit(GITHUB_TOKEN, {log: console});
            const context = github.context;

            //submit a comment
            await octokit.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body: markdown
            });
        }
        else {
            core.setOutput('results', markdown);
        }
    } catch (e) {
        core.setFailed(`Action failed with error comment ${e}`);
    }
}
function collectData(results, runData, specResults) {
    let testData = {
        "url": results.data.url,
        "testLink": results.data.summary,
        "waterfall": results.data.median.firstView.images.waterfall,
        "metrics": []
    }
    for (const [key, value] of Object.entries(METRICS)) {
        core.debug(key);
        core.debug(value);
        if (results.data.median.firstView[key]) {
            testData.metrics.push({
                "name": value,
                "value": results.data.median.firstView[key]
            })
        }
    }

    testData.budgetsExceeded = specResults.err && specResults.err > 0;
    runData["tests"].push(testData);
}
async function run() {
    const wpt = new WebPageTest('www.webpagetest.org',WPT_API_KEY);

    //TODO: make this configurable
    let options = {
        "firstViewOnly": true,
        "runs": 3,
        "location": 'Dulles:Chrome',
        "connectivity": '4G',
        "pollResults": 5,
        "timeout": 240,
        "emulateMobile": true
    }
    if (WPT_OPTIONS) {
        let settings = require(`${DIRECTORY}/${WPT_OPTIONS}`);
        if (typeof settings === 'object' && settings !== null) {
            core.debug(settings);
            options = {
                ...options,
                ...settings
            }
        } else {
            core.setFailed("The specified WebPageTest settings aren't a valid JavaScript object");
        }

    }
    if (WPT_BUDGET) {
        options.specs = require(`${DIRECTORY}/${WPT_BUDGET}`);
    }
    if (WPT_LABEL) {
        options.label = WPT_LABEL;
    }

    core.startGroup('WebPageTest Configuration');
    core.info(`WebPageTest settings: ${JSON.stringify(options, null, '  ')}`)
    core.endGroup();

    core.startGroup(`Testing urls in WebPageTest..`);
    //for our commit
    let runData = {};
    runData["tests"] = [];
    runData["label"] = WPT_LABEL;

    Promise.all(WPT_URLS.map(async url=> {
        try {
            await runTest(wpt, url, options)
                .then(async result => {
                    try {
                        if (result.result.testId) {
                            //test submitted with specs
                            core.info('Tests successfully completed for '
                                        + url +'. Full results at https://'
                                        + wpt.config.hostname + '/result/' + result.result.testId);

                            let testResults = await retrieveResults(wpt, result.result.testId);

                            core.info('Performance budget info: ' + result.err);
                            collectData(testResults, runData, result);

                            if (GH_EVENT_NAME == 'pull_request') {
                                // testspecs also returns the number of assertion fails as err
                                // > 0 means we need to fail
                                if (result.err && result.err > 0) {
                                    if (result.err == 1) {
                                        core.setFailed('One performance budget not met.')
                                    } else {
                                        core.setFailed(result.err + ' performance budgets not met.')
                                    }
                                }
                            }

                            return;
                        } else if (result.result.data) {
                            //test was submitted without testspecs
                            core.info('Tests successfully completed for ' + url
                                +'. Full results at ' + result.result.data.summary);

                            let testResults = await retrieveResults(wpt, result.result.data.id);
                            core.info('Performance budget info: ' + result.err);
                            collectData(testResults, runData, result);

                            return;
                        } else {
                            return;
                        }
                    } catch (e) {
                        core.setFailed(`Action failed with error inside ${e}`);
                    }
                    
                });
            } catch (e) {
                core.setFailed(`Action failed with error outside ${e.message}`);
            }
    })).then(() => {
        renderComment(runData);
    });
    
    return;
}

run();