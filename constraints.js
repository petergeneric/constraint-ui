function constraints_init(constraintListElement) {
	constraintListElement = $(constraintListElement);
	
	constraintListElement.find("select.constraint_add").change(
	function constraintAddSelectChanged() {
		if (this.value != "") {
			// Add a new field if necessary
			var newConstraintField = createNewConstraintField($(this), this.value);
				
			// Add a new field value
			createNewConstraintValue(newConstraintField, "_f_eq_");
			
			$(this).val("");
		}
	});
	
	constraintListElement.find(".constraint_search_submit").click(function() {
		encodeConstraintValues($(this));
		
		return true;
	});
	
	constraintListElement.find("a.debug_constraint_decode_all").click(function() {
		decodeConstraintValues($(this));
	});
}

function createNewConstraintField(contextElement, fieldName) {
	contextElement = $(contextElement);
	
	var constraintFieldElement = getConstraintField(contextElement, fieldName);
	
	if (constraintFieldElement == null) {
		var constraintList = contextElement.closest(".constraint_list");
		
		// Construct a new constraint field
		constraintFieldElement = constraintList.find("li.prototype_constraint_field").clone();
		
		var insertionPoint = constraintList.find("li.constraint_add"); // element before which we insert new constraint_field

		constraintFieldElement.removeClass("prototype_constraint_field");
		constraintFieldElement.addClass("constraint_field");
		constraintFieldElement.insertBefore(insertionPoint);
	
		constraintFieldElement.find(".constraint_field_name").html(fieldName);
	
		setupConstraintFieldLinks(constraintFieldElement);
	}
	
	return constraintFieldElement;
}

function hasConstraintField(contextElement, fieldName) {
	return (getConstraintField(contextElement, fieldName) != null);
}

function getConstraintField(contextElement, fieldName) {
	var constraintList = $(contextElement).closest(".constraint_list");

	// Search for constraint_field_name elements matching the requested field name
	var results = constraintList.find(".constraint_field").filter(function() {
		return ($(this).find(".constraint_field_name").text() == fieldName);
	});

	if (results.size() == 0) {
		return null;
	}
	else {
		return $(results[0]);
	}
}

function setupConstraintFieldLinks(constraintFieldElement) {
	// Set up the add constraint value link
	constraintFieldElement.find("a.constraint_value_add").click(function() {
		var constraintFieldElement = $(this).closest("li.constraint_field");

		createNewConstraintValue(constraintFieldElement, "_f_eq_");
	});
	
	// Set up the remove link
	constraintFieldElement.find("a.constraint_remove").click(function() {
		var constraintFieldElement = $(this).closest("li.constraint_field");
		
		constraintFieldElement.remove();
	});
}

// Constructs a new constraint value entry
function createNewConstraintValue(constraintFieldElement, encodedConstraint) {
	var constraintValueElement = $("li.prototype_constraint_value").clone();

	var constraintValueAddElement = constraintFieldElement.find("li.constraint_value_add");
	constraintValueElement.removeClass("prototype_constraint_value");
	constraintValueElement.addClass("constraint_value");
	constraintValueElement.insertBefore(constraintValueAddElement);

	// Set up links and function select change tracking
	setupConstraintValueLinks(constraintValueElement);
	
	// set initial value so we populate the input fields necessary
	setConstraintValueEncoded(constraintValueElement, encodedConstraint);
}

function setupConstraintValueLinks(constraintValueElement) {
	constraintValueElement.find("a.constraint_value_remove").click(function() {
		$(this).closest(".constraint_value").remove();
	});
	
	constraintValueElement.find("select.constraint_function").change(function() {
			setConstraintValue($(this).closest(".constraint_value"), $(this).val(), "");
	});
	
	constraintValueElement.find("a.debug_constraint_value_display_encoded").click(function() {
		var constraintValue = $(this).closest(".constraint_value");
		
		alert(getConstraintValueEncoded(constraintValue));
	});
	
	constraintValueElement.find("a.debug_constraint_value_set_encoded").click(function() {
		var constraintValue = $(this).closest(".constraint_value");
		
		var encoded = prompt("Encoded constraint", "_f_eq__test");
		setConstraintValueEncoded(constraintValue, encoded);
	});
}


// Given a Constraint Value <li>, returns the encoded representation of the function+value(s) combination
// Argument constraintValueElement: a jquery object representing a Constraint_Value (li.constraint_value)
// Returns: 
function getConstraintValueEncoded(constraintValueElement) {
	var functionSelect = constraintValueElement.find("select.constraint_function");
	
	var func = functionSelect.val();
	
	if (func == "eq" || func == "contains") {
		var inputField = constraintValueElement.find(".constraint_value_inputs input");
		
		if (func == "eq" && inputField.val().indexOf("_") == 0)
			return "_f_eq_" + inputField.val(); // Special-case eq starting with an _ (requires bulkier encoding)
		else if (func == "eq")
			return inputField.val();
		else if (func == "contains")
			return "_f_contains_" + inputField.val();
	}
	else if (func == "isnull") {
		return "_null";
	}
	else if (func == "notnull") {
		return "_notnull";
	}
	else if (func == "range") {
		var low = constraintValueElement.find(".constraint_value_inputs input.constraint_param_low");
		var high = constraintValueElement.find(".constraint_value_inputs input.constraint_param_high");
		return "_f_range_" + low.val() + ".." + high.val();
	}
	
	return "unknown-function-" + func;
}

// Given an encoded constraint value it changes the constraint displayed in the UI to match
// Argument constraintValueElement: a jquery object representing a Constraint_Value (li.constraint_value)
//
// Returns: nothing		
function setConstraintValueEncoded(constraintValueElement, encoded) {
	if (encoded.indexOf("_") != 0) // raw eq
		setConstraintValue(constraintValueElement, "eq", encoded);
	else if (encoded.indexOf("_f_eq_") == 0) // encoded eq
		setConstraintValue(constraintValueElement, "eq", encoded.substring(6));
	else if (encoded.indexOf("_f_contains_") == 0) // contains
		setConstraintValue(constraintValueElement, "contains", encoded.substring(12));
	else if (encoded == "_null") // is null
		setConstraintValue(constraintValueElement, "isnull", "");
	else if (encoded == "_notnull") // is not null
		setConstraintValue(constraintValueElement, "notnull", "");
	else if (encoded.indexOf("_f_range_") == 0) { // range 
		encoded = encoded.substring(9); // strip _f_range_
		
		var functionArgs = encoded.split("..",2);
		
		setConstraintValue(constraintValueElement, "range", functionArgs);
	}
	else
		alert("Unknown encoded value: " + encoded);
}

function setConstraintValue(constraintValueElement, constraintFunction, functionArgs) {
	var constraintList = constraintValueElement.closest(".constraint_list");
	var functionSelect = constraintValueElement.find("select.constraint_function");
	var inputs = constraintValueElement.find(".constraint_value_inputs");
	
	inputs.empty(); // remove all existing controls
	
	if (constraintFunction == "eq" || constraintFunction == "contains") {
		// eq or contains - both take a single text argument
		var eqInput = constraintList.find(".prototype_constraint_input_eq input").clone();

		eqInput.val(functionArgs);
		inputs.append(eqInput);
	}
	else if (constraintFunction == "range") {
		// range - takes 2 text arguments
		var rangeInputs = constraintList.find(".prototype_constraint_input_range input").clone();

		rangeInputs.filter("input.constraint_param_low").val(functionArgs[0]);
		rangeInputs.filter("input.constraint_param_high").val(functionArgs[1]);

		inputs.append(rangeInputs);
	}
	else if (constraintFunction == "notnull" || constraintFunction == "isnull") {
		// isNull or isNotNull - both take no arguments
		functionSelect.val(constraintFunction);
	}
	else {
		alert("Unknown constraint function: " + constraintFunction);
		setConstraintValue(constraintValueElement, "eq", ""); // change to eq ""
		return;
	}

	// Now change functionSelect to reflect this new function
	// N.B. Don't set the value if there's been no change
	if (functionSelect.val() != constraintFunction) {			
		functionSelect.val(constraintFunction);
	}
}

// Encode all constraint values, writing them out as a series of hidden inputs
function encodeConstraintValues(contextElement) {
	var constraintList = contextElement.closest(".constraint_list");
	var fields = constraintList.find(".constraint_field");
	var hiddenForm = constraintList.find(".constraint_form_fields");
	
	hiddenForm.empty(); // remove previously generated results
	
	fields.each(function(i, field) {
		var fieldName = $(field).find(".constraint_field_name").text();

		$(field).find(".constraint_value").each(function(j, fieldValue) {
			var encoded = getConstraintValueEncoded($(fieldValue));
			
			var inputElement = $('<input type="hidden" />');
			inputElement.attr("name", fieldName);
			inputElement.val(encoded);
			
			hiddenForm.append(inputElement);
		});
	});
}

function decodeConstraintValues(contextElement) {
	var constraintList = contextElement.closest(".constraint_list");
	
	// clear any current constraints
	constraintList.find(".constraint_field").remove();
	
	console.log("Results: " + constraintList.find(".constraint_form_fields input").size());
	
	constraintList.find(".constraint_form_fields input").each(function(i, input) {
		input = $(input);
		
		var fieldName = input.attr("name");
		var encoded = input.val();

		// Create (or get) the field
		var constraintFieldElement = createNewConstraintField(contextElement, fieldName);
		
		// Add the constraint
		createNewConstraintValue(constraintFieldElement, encoded);
	});
}
