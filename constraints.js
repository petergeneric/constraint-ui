var constraintSchema = {
	'id': {
		type: 'number',
		nullable: false
	},
	
	'priority': {
		type: 'number',
		nullable: true,
	},

	'deprecated': {
		type: 'boolean',
		nullable: true
	},
	
	'name': {
		type: 'string',
		nullable: true
	},
	
	'lastUpdated': {
		caption: 'last updated',
		type: 'datetime',
		nullable: true
	},

	'state': {
		type: 'enum',
		values: ['ONE', 'TWO', 'THREE', 'FAILED']
	}
}

var constraintMap = {'priority':['50'],'_limit':['200'],'state':['FAILED'],'_offset':['0']};

function renderAddField() {
	var obj = {"ids": []};
	
	for (var key in constraintSchema) {
		var val;
		
		if ('caption' in constraintSchema[key])
			val = constraintSchema[key].caption;
		else
			val = key;
		
		obj["ids"].push({'id':key,'caption':val});
	}
	
	return Mustache.render('<select class="constraint_add_field"><option value=""></option>{{#ids}}<option value="{{id}}">{{caption}}</option>{{/ids}}</select>', obj);
}

function getFunctions(fieldName) {
	var schema = constraintSchema[fieldName];
	
	var functions = [];
	
	if (schema === undefined || schema == null) {
		throw "No such field: " + fieldName;
	}
	
	// Always allow eq and neq
	functions[functions.length] = {name: "eq", text: "Is"};
	functions[functions.length] = {name: "neq", text: "Is Not"};
	
	if (schema.nullable == true) {
		functions[functions.length] = {name: "isNull", text: "Is Not Present"};
		functions[functions.length] = {name: "isNotNull", text: "Is Present"};
	}
	
	if (schema.type == 'string') {
		functions[functions.length] = {name: "startsWith", text: "Starts With"};
		functions[functions.length] = {name: "contains", text: "Contains"};
	}
	
	if (schema.type == 'number' || schema.type == 'datetime' || schema.type == 'string') {
		functions[functions.length] = {name: "range", text: "Between"};
	}
	
	return { 'functions': functions};
}

function renderFunctions(functionDefs) {
	return Mustache.render('<select class="constraint_function"></option>{{#functions}}<option value="{{name}}">{{text}}</option>{{/functions}}</select>', functionDefs);
}

//	returns HTML elements for the provided function (optionally with the default values filled in from argument)
function renderInput(fieldName,functionName, argument) {
	var schema = constraintSchema[fieldName];
	
	// TODO render intelligently based on data type
	
	switch(functionName) {
		case "eq":
		case "neq":
		case "startsWith":
		case "contains":
		case "gt":
		case "ge":
		case "lt":
		case "le":
			// TODO if schema.type == 'enum' then generate a select
			// TODO if schema.type == 'number' then generate input with type=number
			// TODO if schema.type == string then generate input with type=string
			// TODO if schema.type == datetime then generate a datetime picker
			// TODO if schema.type == boolean then generate an enum of yes/no (or a checkbox?)
			var args={value: argument, inputType: (schema.type == 'number') ? "number" : "text"};
			return Mustache.render('<input name="value" type="{{inputType}}" value="{{value}}" />', args);
		case "range":
			if (argument == "" || argument == null)
				argument="..";
			
			var fields = argument.split("..",2);
			var args={from:fields[0],to:fields[1], inputType: (schema.type == 'number') ? "number" : "text"}
			return Mustache.render('<input name="from" type="{{inputType}}" value="{{from}}" /> <input name="to" type="{{inputType}}" value="{{to}}" />',args);
		case "isNull":
		case "isNotNull":
			return "";
		default:
			alert("Unknown function: " + functionName + "!");
	}
}


function encodeInputs(inputsSpan, functionName, fieldName) {
	var schema = constraintSchema[fieldName];
	
	// TODO needs to be modified when intelligently rendering inputs based on data type
	
	if (functionName == "eq" || functionName == "neq" || functionName == "startsWith" || functionName == "contains") {
		return $(inputsSpan).find('input[name="value"]').val();
	}
	else if (functionName == 'range') {
		return $(inputsSpan).find('input[name="from"]').val() + '..' + $(inputsSpan).find('input[name="to"]').val();
	}
}


function constraintFunctionChange() {
	var constraintLI = $(this).closest("li");
	var functionName = $(this).val();
	
	setConstraintFunction(constraintLI, functionName, "");
}

function setConstraintFunction(constraintLI, functionName, argument) {
	var fieldName = $(constraintLI).closest("[data-field-name]").data("field-name");
	var functionSelect = $(constraintLI).find("select:first");
	var inputsSpan = $(constraintLI).find("span.inputs");
	
	functionSelect.val(functionName);
	inputsSpan.html(renderInput(fieldName, functionName, argument));
}

function encodeConstraint(fieldName, constraintLI) {
	var functionSelect = $(constraintLI).find("select:first");
	var inputsSpan = $(constraintLI).find("span.inputs");
	
	var functionName = functionSelect.val();
	
	if (functionName == 'isNull')
		return '_null';
	else if (functionName == 'isNotNull')
		return '_notnull';
	else {
		var encodedValue = encodeInputs(inputsSpan, functionName, fieldName);
		
		// For eq, as long as the value doesn't begin with _ we can use a simpler notation
		if (functionName == 'eq' && encodedValue.charAt(0) != '_')
			return encodedValue;
		else
			return '_f_' + functionName + '_' + encodedValue;
	}
}

function encodeConstraints() {
	var encoded = {};
	$('#constraintui > li[data-field-name]').each(function() {
		var fieldName = $(this).data("field-name");	
		
		var values = [];
		
		$(this).find("li").each(function() {
			values[values.length] = encodeConstraint(fieldName, $(this));
		});
		
		encoded[fieldName] = values;
	});

	$('#constraintui > input.literal-constraint').each(function() {
		var fieldName = $(this).attr('name');
		
		if (!(fieldName in encoded)) {
			encoded[fieldName] = [];
		}
		
		encoded[fieldName].push($(this).val());
	});
	
	return encoded;
}

function decodeConstraints(encoded) {
	// Remove all constraints
	removeConstraints();
	
	// Add the encoded constraints
	for (var key in encoded) {
			var val = encoded[key];
			
			if (typeof val === 'string') {
				addConstraint(key, val);
			}
			else {
				for (var i in val) {
					addConstraint(key, val[i]);
				}
			}
	}
}



function addConstraint(fieldName, encoded) {
	
	if (encoded.startsWith("_f_")) {
		var fields = encoded.split("_", 1);
		
		addConstraint(fieldName, fields[2], fields[3]);
	}
	else {
		addConstraint(fieldName, null, argument);
	}
}

function addConstraint(fieldName, functionName, argument) {
	if (argument === undefined && functionName != null) {
		var encoded = functionName;
		
		if (encoded.startsWith("_f_")) {
			var fields = encoded.split("_", 4);
			
			functionName= fields[2];
			argument = fields[3];
		}
		else {
			functionName = null;
			argument = encoded;
		}
	}
	
	// Default the function name
	if (functionName == null)
		functionName = 'eq';
	
	if (fieldName.startsWith("_")) {
		$("#constraintui").append(Mustache.render('<input class="literal-constraint" type="hidden" name="{{name}}" value="{{value}}" />', {'name': fieldName, 'value': argument}));
	}
	else {
		// TODO figure out if we have a field already. If we do already when skip the addition of the field entry
		var existingField = $("#constraintui li[data-field-name='"+fieldName+"']");
	
		if (existingField.length > 0) {
			// Find the UL
			var constraintUL = $(existingField).find("ul");
		
			constraintUL.append('<li class="constraint-line">' + renderFunctions(getFunctions(fieldName)) + '<span class="inputs" /> <a class="constraint-line_remove" href="#" shape="rect">remove<i class="icon-remove-circle"></i></a></li>');
		
			var functionSelect = constraintUL.find("li:last > select:first");
		
			functionSelect.change(constraintFunctionChange);

			// set the default value
			setConstraintFunction(functionSelect.parent(), functionName, argument);
			
			constraintUL.find("a.constraint-line_remove").click(function() {
				if ($(this).closest("li[data-field-name]").find("li.constraint-line").length == 1) {
					// This was the last constraint, remove this field's entry
					$(this).closest("li[data-field-name]").remove();
				}
				else {
					// Remove only this constraint line
					$(this).closest("li.constraint-line").remove();
				}
			});
		}
		else {
			var skel = $('<li data-field-name="' + fieldName +'">' + fieldName + ' matches any of: <a class="constraint_remove" href="#" shape="rect">remove<i class="icon-remove"></i></a><ul></ul></li>');
			$("#constraintui").append(skel);
		
			skel.find("a.constraint_remove").click(function() {
				$(this).closest("li[data-field-name]").remove();
			});
		
			addConstraint(fieldName,functionName,argument);
		}
	}
}

function removeConstraints() {
	$("#constraintui").empty();
}