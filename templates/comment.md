*<%- label %>*
<% tests.forEach((test) => { %>
>Page: <%- test.url %> *(<%if (test.budgetsExceeded) { %>Exceeds budgets<% } else { %>Meets budgets<% } %>)*
><% test.metrics.forEach((metric) => { %>\n>*<%- metric.name %>*: <%- metric.value %><% }); %>
>
> Full result: <%- test.testLink %>

<% }); %>