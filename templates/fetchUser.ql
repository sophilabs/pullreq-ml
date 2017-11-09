{
  user(login: <%= JSON.stringify(user) %>) {
    id,
    name,
    merged: pullRequests(states: MERGED) {
      totalCount
    },
    closed: pullRequests(states: CLOSED) {
      totalCount
    },
    open: pullRequests(states: OPEN) {
      totalCount
    },
    followers {
      totalCount
    },
    following {
        totalCount
    }
  }
}