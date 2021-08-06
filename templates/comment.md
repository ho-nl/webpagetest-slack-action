*<%- label %>*
<% tests.forEach((test) => { %>
## Page Tested:<%- test.url %>
<%if (test.budgetsExceeded) { %>
Test exceeds performance budgets
<% } else { %>
Test meets performance budgets
<% } %>
<%- test.budgetsExceeded %>

<% test.metrics.forEach((metric) => { %>*<%- metric.name %>*: <%- metric.value %>\n  <% }); %>
Full test results: <%- test.testLink %>
<% }); %>