*<%- label %>*
<% tests.forEach((test) => { %>
<%- test.url %> - <<%- test.testLink %>|Full result> \n
<% test.metrics.forEach((metric, key) => { %>*<%- metric.name.match(/\b(\w)/g).join('').toUpperCase() %>*: <%- parseFloat(metric.value).toFixed(3).replace(/\.000$/, '') %><% if (test.metrics.length -1 !== key) {%>, <% }});%>
<% }); %>
