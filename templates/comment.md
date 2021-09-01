*<%- label %>*
<% tests.forEach((test) => { %>
<%- test.url %>: *(<%if (test.budgetsExceeded) { %>Exceeds budgets<% } else { %>Meets budgets<% } %>)* - <http://www.example.com|Full result> \n
<% test.metrics.forEach((metric, key) => { %>\n>*<%- metric.name.match(/\b(\w)/g).join('') %>*: <%- parseFloat(metric.value).toFixed(3) %><% if (test.metrics.length -1 !== key) {%>, <% }});%>
<% }); %>
