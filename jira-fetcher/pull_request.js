const axios = require('axios');
const _ = require('lodash');

/**
 *
 * @param id - each ticket has an ID which is different than ticket identifier (ticket-id) and we need to use to to fetch it
 * @param issue - ticket-id in the format of "HIP-23456" but we take only the "23456" portion of it as an input - we only work on HIP project ATM
 * @returns {Promise<*>} a pull-request that's attached to the ticket if found
 */
async function getPR(id, issue) {
    const resp = await axios.post("https://myhippo.atlassian.net/jsw/graphql?operation=DevSummaryPanelOneClickUrls",
        `{\"operationName\":\"DevSummaryPanelOneClickUrls\",\"query\":\"\\n    query DevSummaryPanelOneClickUrls ($issueId: ID!) {\\n        developmentInformation(issueId: $issueId){\\n            \\n    details {\\n        instanceTypes {\\n            id\\n            repository {\\n                branches {\\n                    url\\n                }\\n                commits{\\n                    url\\n                }\\n                pullRequests {\\n                    url\\n                    status\\n                }\\n            }\\n            danglingPullRequests {\\n                url\\n                status\\n            }\\n            buildProviders {\\n                id\\n                builds {\\n                    url\\n                    state\\n                }\\n            }\\n         }\\n    }\\n\\n        }\\n    }\",\"variables\":{\"issueId\":\"${id}\"}}`,
        {
            "headers": {
                "accept": "application/json,text/javascript,*/*",
                "accept-language": "en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7,es-US;q=0.6,es;q=0.5",
                "content-type": "application/json",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"96\", \"Google Chrome\";v=\"96\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-atlassian-capability": "ISSUE_VIEW",
                "cookie": "ajs_anonymous_id=%22d4c55962-f868-4f52-bb79-c5cfbfec5653%22; ajs_group_id=null; atlassian.xsrf.token=B5P1-J056-CW1M-B4QI_8da371715e906d26abf9419c2acabdbf507536fa_lin; JSESSIONID=43C751C6BD9995725D3CE8BD329BCF30; __awc_tld_test__=tld_test; cloud.session.token=eyJraWQiOiJzZXNzaW9uLXNlcnZpY2VcL3Byb2QtMTU5Mjg1ODM5NCIsImFsZyI6IlJTMjU2In0.eyJhc3NvY2lhdGlvbnMiOltdLCJzdWIiOiI1ZjY5YWUxMGVkNTVjNzAwNmFjZDAyMjQiLCJlbWFpbERvbWFpbiI6ImhpcHBvLmNvbSIsImltcGVyc29uYXRpb24iOltdLCJjcmVhdGVkIjoxNjQwMDk4MDgxLCJyZWZyZXNoVGltZW91dCI6MTY0MDIxMTAzMSwidmVyaWZpZWQiOnRydWUsImlzcyI6InNlc3Npb24tc2VydmljZSIsInNlc3Npb25JZCI6ImQwZDQxNzQ5LTdmNGUtNGNmZi04Mzk5LWVkMTkzOGZjMzM1ZSIsImF1ZCI6ImF0bGFzc2lhbiIsIm5iZiI6MTY0MDIxMDQzMSwiZXhwIjoxNjQxNTA2NDMxLCJpYXQiOjE2NDAyMTA0MzEsImVtYWlsIjoibmFsZmFzaUBoaXBwby5jb20iLCJqdGkiOiJkMGQ0MTc0OS03ZjRlLTRjZmYtODM5OS1lZDE5MzhmYzMzNWUifQ.Zak4JnF54V3febIiSv48Ry1Fcl2bIx-o9Xt48KL_jDo0TMBd-vYQhg_oPKrKZB2e8EAw6iorBFdj4qM50supuBdlvq7mtpDxJ_K02EKjCACbv7lVe460APDy7ZIrPTiruJIxv7N7Su3gLtHVq2k0mY-wm0AHZ6dFem2Rw2N-EIQRMmfixuANFpY-8FIJbrz-7wWnRbgzF5pX8LpaT38Lj-UAUO426cmdmM0QcujuUNmT70bvk63prGMYfk6G_zRjWFT3YzUW7bgtix7Ot54OkJxEWo4b3bqf4J-V4SRT-oifPBXb5SvN_Jr_g7hLSwSstoMtfJi0Kyhhp34B7ZaV8A",
                "Referer": "https://myhippo.atlassian.net/browse/HIP-23969",
                "Referrer-Policy": "same-origin"
            }
        });

    // console.log('resp2:', resp);
    const contexts = _.get(resp, 'data.data.developmentInformation.details.instanceTypes');
    let pullRequest;
    contexts.forEach(c => {
        const repositories = c.repository;
        repositories.forEach(repo => {
            const branches = repo.branches;
            const relatedBranch = branches.find(b => b.url.indexOf(issue) > -1);
            if (relatedBranch) {
                const pullRequests = repo.pullRequests;
                pullRequest = pullRequests[0].url;
            }
        });
        if (!pullRequest) {
            pullRequest = _.get(c, 'danglingPullRequests[0].url');
        }
    });
    return pullRequest;
}

exports.getPR = getPR;
