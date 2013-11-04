var constraintSchema = {
	'id': {
		type: 'number',
		nullable: false
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
		type: 'datetime',
		nullable: true
	},

	'state': {
		type: 'enum',
		values: ['ONE', 'TWO', 'THREE']
	}
}

var constraintMap = {'priority':['50'],'_limit':['200'],'state':['FAILED'],'_offset':['0']};

function renderAddField() {
	var obj = {"ids": []};
	
	for (var key in constraintSchema) {
		obj["ids"][obj["ids"].length] = key;
	}
	
	return Mustache.render('<select class="constraint_add_field"><option value=""></option>{{#ids}}<option value="{{.}}">{{.}}</option>{{/ids}}</select>', obj);
}

function getFunctions(columnName) {
	// TODO filter intelligently based on schema
	return { functions: [
		{name: "eq", text: "Is"},
		{name: "neq", text: "Is Not"},
		{name: "isNull", text: "Is Not Present"},
		{name: "isNotNull", text: "Is Present"},
		{name: "range", text: "Between"},
		{name: "startsWith", text: "Starts With"},
		{name: "contains", text: "Contains"}
		]
	};
}

function renderFunctions(functionDefs) {
	return Mustache.render('<select class="constraint_function"></option>{{#functions}}<option value="{{name}}">{{text}}</option>{{/functions}}</select>', functionDefs);
}

//	returns HTML elements for the provided function (optionally with the default values filled in from argument)
function renderInput(columnName,functionName, argument) {
	// TODO render intelligently based on data type
	if (functionName == "eq" || functionName == "neq" || functionName == "startsWith" || functionName == "contains") {
		var args={value: argument};
		return Mustache.render('<input name="value" type="text" value="{{value}}" />', args);
	}
	else if (functionName == "range") {
		// TODO split argument on ..
		// TODO special-case empty string
		var args={from:"a",to:"b"}
		return Mustache.render('<input name="from" type="text" value="{{from}}" /> <input name="to" type="text" value="{{to}}" />',args);
	}
	else if (functionName == "isNull" || functionName == "isNotNull") {
		return "";
	}
}

function renderSkeletonField(fieldName) {
	return '<li data-field-name="' + fieldName +'">' + fieldName + ' matches any of:<ul></ul></li>';
}

function constraintFunctionChange() {
	var constraintLI = $(this).closest("li");
	var functionName = $(this).val();
	
	setConstraintFunction(constraintLI, functionName, "");
}

function setConstraintFunction(constraintLI, functionName, argument) {
	var fieldName = $(constraintLI).closest("[data-field-name]").data("field-name");
	var functionSelect = $(constraintLI).find("select:first")
	var inputsSpan = $(constraintLI).find("span.inputs");
	
	functionSelect.val(functionName);
	inputsSpan.html(renderInput(fieldName, functionName, argument));
}

function addConstraint(fieldName, functionName, argument) {
	// Default the function name
	if (functionName == null) functionName='eq';
	
	// TODO figure out if we have a field already. If we do already when skip the addition of the field entry
	var existingField = $("#constraintui li[data-field-name='"+fieldName+"']");
	
	if (existingField.length != 0) {
		// Find the UL
		var constraintUL = $(existingField).find("ul");
		
		constraintUL.append('<li>' + renderFunctions(getFunctions(fieldName)) + '<span class="inputs" /></li>');
		
		var functionSelect = constraintUL.find("li:last > select:first");
		
		console.log("Found function select",functionSelect);
		functionSelect.change(constraintFunctionChange);

		// set the default value		
		setConstraintFunction(functionSelect.parent(), functionName, argument);
	}
	else {
		// TODO find the location to add the new inputs
		$("#constraintui").append(renderSkeletonField(fieldName));
		
		addConstraint(fieldName,functionName,argument);
		return;
	}
	
	renderFunctions(getFunctions(fieldName))
}
