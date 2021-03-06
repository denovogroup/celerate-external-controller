// Generates a MongoDB sort specification given fields to sort on.
GenerateHeaderSort = function(sort_fields, sort_fields_to_label, primary_sort_field_key) {
  var SortFieldToSpec = function(sort_field) {
    return [sort_fields_to_label[sort_field], Session.get(sort_field) == 1 ? "asc" : "desc"];
  };

  var sort_spec = [];
  var primary_sort_field = Session.get(primary_sort_field_key);
  sort_spec.push(SortFieldToSpec(primary_sort_field));
  for (s in sort_fields) {
    if (sort_fields[s] != primary_sort_field) {
      sort_spec.push(SortFieldToSpec(sort_fields[s]));
    }
  }

  return sort_spec;
};

// Generates a field subquery (to be used in a MongoDB query) that can handle either regex search or exact match.
// Exact match field query inputs are ones that begin with an "=" character.
GenerateFieldQuery = function(query_input) {
  if (query_input.length <= 0 || query_input.charAt(0) !== '=') {
    return { '$regex': query_input, '$options': 'i' };
  }

  return query_input.substr(1);
};

Handlebars.registerHelper('toupper', function(obj) {
  console.log(obj.toUpperCase());
  return obj.toUpperCase();
});

Handlebars.registerHelper('json', function(obj) {
  function syntaxHighlight(json) {
    if (typeof json != 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    if (typeof json === 'string') {
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }
  }
  var str = JSON.stringify(obj, undefined, 4);
  return syntaxHighlight(str);
});

Handlebars.registerHelper('urlencode', function(str) {
  return encodeURI(str);
});

Handlebars.registerHelper('format_date', function(str) {
  if (typeof str === 'undefined' || str === null ||
      (typeof str === 'string' && str.trim() === '')) {
    return '';
  }

  try {
    return moment(str).format("MM-DD-YY");
  } catch (e) {
  }
  return "";
});

Handlebars.registerHelper('remove_spaces_in_string', function(str) {
  return str.replace(" ", "-space-");
});

Handlebars.registerHelper('key_value', function(context, options) {
  var result = [];
  _.each(context, function(value, key, list) {
    result.push({key:key, value:value});
  })
  return result;
});

Handlebars.registerHelper('key_value_without_index', function(context, options) {
  var result = [];
  _.each(context, function(value, key, list) {
    if (key != 'index') {
      result.push({key:key, value:value});
    }
  })
  return result;
});

Handlebars.registerHelper('selected_if_equal', function(val1, val2) {
  if (val1 == val2) return "selected";
  return "";
});

Handlebars.registerHelper('selected_if_empty', function(val) {
  if (!val || val == "") return "selected";
  return "";
});

Handlebars.registerHelper('activeIfTemplateIs', function (template) {
  var currentRoute = Router.current();
  console.log(currentRoute);
  return currentRoute && template === currentRoute.path ? 'active' : '';
});

if (Meteor.isClient) {
  Template.registerHelper('isIterable', function(collection) {
    return typeof collection === "object";
  });

  search_input_lag_ms = 500;
}

