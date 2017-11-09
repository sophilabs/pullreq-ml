{
  repository(owner: <%= JSON.stringify(owner) %>, name: <%= JSON.stringify(name) %>){
    name,
    pullRequests(first:<%= pageSize %>, states: MERGED <% if(after) { %>, after: <%= JSON.stringify(after) %><% } %>) {
      nodes {
        id,
        url,
        timeline(last: 100) {
          nodes{
	          ... on MergedEvent {
      				id,
              actor {
                login
              }
              createdAt,
              url,
						}
          }
        }
      },
      pageInfo {
        hasNextPage,
        hasPreviousPage,
        endCursor,
        startCursor,
      },
      totalCount
    }
  }
}
