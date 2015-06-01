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


function constraints(el, schema) {
	if (el === undefined || el == null) {
		throw "No element or element path provided for constraints UI!";
	}
	else {
		var element = $(el);
		var ui = element.data('constraints');
		
		if (ui === undefined) {
			ui = new ConstraintUI(element, schema);
			
			element.data('constraints', ui);
		}
		
		return ui;
	}
}

function ConstraintUI(element, schema) {
	var self = this;
	
	this.element = element;
	this.schema = schema;
	
	element.append('<h3>Constraints</h3><ul class="constraint-list"><li>Add Constraint: <span class="field-add-ui"></span></li></ul> <br />  <h3>Order</h3><ul class="order-list"><li>Add order: <span class="field-add-ui"></span></li></ul></select>');
	
	this.constraintListElement = element.find("ul.constraint-list");
	this.orderListElement = element.find("ul.order-list");
	
	// Populate constraint add UI
	var constraintAddDiv = this.constraintListElement.find(".field-add-ui");
	constraintAddDiv.html(this.renderFields());
	constraintAddDiv.find("select.field-list").change(function() {
		var fieldName = $(this).val();
		
		if (fieldName != '') {
			/* De-select ready for next use */
			$(this).val('');
			
			self.addConstraint(fieldName, "eq", "");
		}
	});
	
	// Populate add order UI
	var orderAddDiv = this.orderListElement.find(".field-add-ui");
	orderAddDiv.html(this.renderFields());
	orderAddDiv.find("select.field-list").change(function() {
		var fieldName = $(this).val();
	
		if (fieldName != '') {
			/* De-select ready for next use */
			$(this).val('');
			
			self.addOrder(fieldName);
		}
	});
}

ConstraintUI.prototype.renderFields = function(selection) {
	var obj = {"ids": []};
	
	for (var key in this.schema) {
		var val;
		
		if ('caption' in this.schema[key])
			val = this.schema[key].caption;
		else
			val = key;
		
		obj["ids"].push({'id':key,'caption':val, selected: (key == selection) ? 'selected="selected"' : '' });
	}
	
	return Mustache.render('<select class="field-list"><option value=""></option>{{#ids}}<option {{selected}} value="{{id}}">{{caption}}</option>{{/ids}}</select>', obj);
}

ConstraintUI.prototype.getFunctions = function(fieldName) {
	var schema = this.schema[fieldName];
	
	var functions = [];
	
	if (schema === undefined || schema == null) {
		throw "No such field: " + fieldName;
	}
	
	// Always allow eq and neq
	functions.push({name: "eq", text: "Is"});
	functions.push({name: "neq", text: "Is Not"});
	
	if (schema.nullable == true) {
		functions.push({name: "isNull", text: "Is Not Present"});
		functions.push({name: "isNotNull", text: "Is Present"});
	}
	
	if (schema.type == 'string') {
		functions.push({name: "startsWith", text: "Starts With"});
		functions.push({name: "contains", text: "Contains"});
	}
	
	if (schema.type == 'number' || schema.type == 'datetime' || schema.type == 'string') {
		functions.push({name: "range", text: "Between"});
		functions.push({name: "gt", text: '>'});
		functions.push({name: "lt", text: '<'});
		functions.push({name: "ge", text: '>='});
		functions.push({name: "le", text: '<='});
	}
	
	return { 'functions': functions};
}

ConstraintUI.prototype.renderFunctions = function(functionDefs) {
	return Mustache.render('<select class="constraint_function"></option>{{#functions}}<option value="{{name}}">{{text}}</option>{{/functions}}</select>', functionDefs);
}

//	returns HTML elements for the provided function (optionally with the default values filled in from argument)
ConstraintUI.prototype.renderInput = function(fieldName,functionName, argument) {
	var schema = this.schema[fieldName];
	
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
			// TODO implement some date/time picker logic for datetime fields?
			if (schema.type == 'enum' || schema.type == 'boolean') {
				var args = {value: argument, selected: function() { if (this == argument) return 'selected="selected"'; else return ''; }};
				if (schema.type == 'boolean') {
					args.options = ['true', 'false'];
				}
				else {
					args.options = schema.values;
				}
				
				return Mustache.render('<select name="value" type="{{inputType}}" value="{{value}}">{{#options}}<option {{selected}}>{{.}}</option>{{/options}}</select>', args);
			}
			else {
				var args={value: argument, inputType: (schema.type == 'number') ? "number" : "text"};
				return Mustache.render('<input name="value" type="{{inputType}}" value="{{value}}" />', args);
			}
		case "range":
			if (argument == "" || argument == null)
				argument="..";
			
			var fields = argument.split("..",2);
			var args={from:fields[0],to:fields[1], inputType: "text"}
			return Mustache.render('<input name="from" type="{{inputType}}" value="{{from}}" /> <input name="to" type="{{inputType}}" value="{{to}}" />',args);
		case "isNull":
		case "isNotNull":
			return "";
		default:
			alert("Unknown function: " + functionName + "!");
	}
}


ConstraintUI.prototype.encodeInputs = function(inputsSpan, functionName, fieldName) {
	var schema = this.schema[fieldName];
	
	// TODO needs to be modified when intelligently rendering inputs based on data type

	switch(functionName) {
		case 'eq':
		case 'neq':
		case 'startsWith':
		case 'contains':
		case 'gt':
		case 'lt':
		case 'ge':
		case 'le':
			return $(inputsSpan).find('input[name="value"], select[name="value"]').val();
		case 'range':
			return $(inputsSpan).find('input[name="from"]').val() + '..' + $(inputsSpan).find('input[name="to"]').val();
		default:
			throw "Do not know how to extract value for function: " + functionName + " and field " + fieldName;
	}
}

ConstraintUI.prototype.setConstraintFunction = function(constraintLI, functionName, argument) {
	var fieldName = $(constraintLI).closest("[data-field-name]").data("field-name");
	var functionSelect = $(constraintLI).find("select:first");
	var inputsSpan = $(constraintLI).find("span.inputs");
	
	functionSelect.val(functionName);
	inputsSpan.html(this.renderInput(fieldName, functionName, argument));
}

ConstraintUI.prototype.encodeConstraint = function(fieldName, constraintLI) {
	var functionSelect = $(constraintLI).find("select:first");
	var inputsSpan = $(constraintLI).find("span.inputs");
	
	var functionName = functionSelect.val();
	
	if (functionName == 'isNull')
		return '_null';
	else if (functionName == 'isNotNull')
		return '_notnull';
	else {
		var encodedValue = this.encodeInputs(inputsSpan, functionName, fieldName);
		
		// For eq, as long as the value doesn't begin with _ we can use a simpler notation
		if (functionName == 'eq' && encodedValue.charAt(0) != '_')
			return encodedValue;
		else
			return '_f_' + functionName + '_' + encodedValue;
	}
}

ConstraintUI.prototype.encodeOrder = function(orderLI) {
	var fieldName = $(orderLI).find("select.field-list").val();
	var direction = $(orderLI).find("select[name=direction]").val();
	
	return fieldName + ' ' + direction;
}

ConstraintUI.prototype.encodeConstraints = function() {
	var self = this;
	
	var encoded = {};
	this.constraintListElement.find('li[data-field-name]').each(function() {
		var fieldName = $(this).data("field-name");	
		
		var values = [];
		
		$(this).find("li").each(function() {
			values[values.length] = self.encodeConstraint(fieldName, $(this));
		});
		
		encoded[fieldName] = values;
	});

	this.constraintListElement.find('input.literal-constraint').each(function() {
		var fieldName = $(this).attr('name');
		
		if (!(fieldName in encoded)) {
			encoded[fieldName] = [];
		}
		
		encoded[fieldName].push($(this).val());
	});
	
	this.orderListElement.find("li.order-line").each(function() {
		if (!( '_order' in encoded)) {
			encoded['_order'] = [];
		}
		
		encoded['_order'].push(self.encodeOrder(this));
	});
	
	return encoded;
}

ConstraintUI.prototype.decodeConstraints = function(encoded) {
	// Remove all constraints
	this.clear();
	
	// Add the encoded constraints
	for (var key in encoded) {
			var val = encoded[key];
			
			if (typeof val === 'string') {
				this.addConstraint(key, val);
			}
			else {
				for (var i in val) {
					this.addConstraint(key, val[i]);
				}
			}
	}
}

ConstraintUI.prototype.addOrder = function(fieldName, direction) {
	if (direction === undefined || direction == null) {
		direction = "asc";
	}
	
	var existingElement = this.orderListElement.find('li.order-line > select.field-list').filter(function(i,e) {
		return ($(e).val() == fieldName);
	});
	
	var alreadyExists = existingElement.length > 0;
	
	if (!alreadyExists) {
		var insertionPoint = this.orderListElement.find("li:last-child");

		var ascDescSelect;
		{	
			var args = {options: ['asc', 'desc'], selected: function() { if (this == direction) return 'selected="selected"'; else return ''; }};
		
			ascDescSelect = Mustache.render('<select name="direction">{{#options}}<option {{selected}}>{{.}}</option>{{/options}}</select>', args);
		}
	
		var el = $('<li class="order-line">' + this.renderFields(fieldName) + ' ' + ascDescSelect + '<a class="order-line_remove" href="#" shape="rect">remove<i class="icon-remove-circle"></i></a></li>');
		
		el.find("a.order-line_remove").click(function() {
			$(this).closest("li.order-line").remove();
		});
		
		el.insertBefore(insertionPoint);
	}
}

ConstraintUI.prototype.addConstraint = function(fieldName, functionName, argument) {
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
		if (fieldName == '_order') {
			// Call the addOrder logic
			var fields = argument.split(" ", 2);
			
			this.addOrder(fields[0], fields[1]);
		}
		else {
			// Carry it as a literal field
			this.constraintListElement.append(Mustache.render('<input class="literal-constraint" type="hidden" name="{{name}}" value="{{value}}" />', {'name': fieldName, 'value': argument}));
		}
	}
	else {
		var schema = this.schema[fieldName];
	
		// TODO figure out if we have a field already. If we do already when skip the addition of the field entry
		var existingField = this.constraintListElement.find("li[data-field-name='"+fieldName+"']");
	
		if (existingField.length > 0) {
			// Find the UL
			var constraintUL = $(existingField).find("ul");
		
			constraintUL.append('<li class="constraint-line">' + this.renderFunctions(this.getFunctions(fieldName)) + '<span class="inputs" /> <a class="constraint-line_remove" href="#" shape="rect">remove<i class="icon-remove-circle"></i></a></li>');
		
			var functionSelect = constraintUL.find("li:last > select:first");
		
			var self = this;
			functionSelect.change(function() {
				var constraintLI = $(this).closest("li");
				var functionName = $(this).val();
	
				self.setConstraintFunction(constraintLI, functionName, "");
			});

			// set the default value
			this.setConstraintFunction(functionSelect.parent(), functionName, argument);
			
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
			var caption = ('caption' in schema) ? schema.caption : fieldName;
			var skel = $('<li data-field-name="' + fieldName +'">' + caption + ' matches any of: <a class="constraint_remove" href="#" shape="rect">remove<i class="icon-remove"></i></a><ul></ul></li>');
			this.constraintListElement.prepend(skel);
		
			skel.find("a.constraint_remove").click(function() {
				$(this).closest("li[data-field-name]").remove();
			});
		
			this.addConstraint(fieldName,functionName,argument);
		}
	}
}

ConstraintUI.prototype.nextPage = function() {
	// TODO set _offset = _offset + _limit
}

ConstraintUI.prototype.prevPage = function() {
	// TODO set _offset = max(0, _offset - _limit)
}

ConstraintUI.prototype.clear = function() {
	this.clearConstraints();
	this.clearOrders();
}

// Remove all constraints
ConstraintUI.prototype.clearConstraints = function() {
	this.constraintListElement.find("li[data-field-name]").remove();
}

// Remove all orderings
ConstraintUI.prototype.clearOrders = function() {
	this.orderListElement.find("li.order-line").remove();
}