*<%- label %>*
<% tests.forEach((test) => { %>
## Page Tested:<%- test.url %>
<%- test.specResults %>
<% test.metrics.forEach((metric) => { %>*<%- metric.name %>*: <%- metric.value %>\n  <% }); %>
Full test results: <%- test.testLink %>
<% }); %>