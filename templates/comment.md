*<%- label %>*
<% tests.forEach((test) => { %>
Page: <%- test.url %> *(<%if (test.budgetsExceeded) { %>Exceeds budgets<% } else { %>
Meets budgets<% } %>)*

<% test.metrics.forEach((metric) => { %>*<%- metric.name %>*: <%- metric.value %>\n  <% }); %>
Full test results: <%- test.testLink %>
<% }); %>