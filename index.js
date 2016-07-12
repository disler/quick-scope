// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron')

//browser window
const BrowserWindow = require("electron").remote.BrowserWindow;

//path library
const path = require('path');

//angularjs for two way data binding
require('angular');

//jquery for dom manip
const $ = require('jquery');

//personal processing lib
const dew = new (require('./DEW.js').DEW)();

//load script hooks
let lstScriptHooks = dew.LoadScripts();

//nodejs process starter
let exec = require('child_process').exec;

/*
	Begin angularjs
*/
var indexApp = angular.module('indexApp', []).controller('indexController', function($scope)
{	

	/*		Angular Vars		*/
	$scope.oViewBag = {
		sInput : "",
		sOutput : "Welcome to Quick Scope",
		sOutputColor : "#000",
		sInputIntellisense : ""
	};

	//list of commands that were entered
	$scope.oHistoryBag = {
		lstPreviousEnteredCommands : [],
		iPreviousEnteredCommandIndex : -1
	};

	/*		Methods			*/

	/*
		Add command to previous command history
	*/
	$scope.AddToCommandHistory = function(sCommand)
	{
		$scope.oHistoryBag.lstPreviousEnteredCommands.unshift(sCommand);
	}

	/*
		Run through command history
	*/
	$scope.CommandHistory = function(bUp)
	{
		let lstCommand = $scope.oHistoryBag.lstPreviousEnteredCommands;
		let iCommandIndex = $scope.oHistoryBag.iPreviousEnteredCommandIndex;

		if(lstCommand.length > 0)
		{
			if(bUp)
			{
				iCommandIndex++;
				if(lstCommand.length === iCommandIndex)
					iCommandIndex = 0;
			}
			else
			{
				iCommandIndex--;
				if(iCommandIndex < 0)
					iCommandIndex = $scope.oHistoryBag.lstPreviousEnteredCommands.length - 1;
			}
			
			$scope.oHistoryBag.iPreviousEnteredCommandIndex = iCommandIndex;
			$scope.oViewBag.sInput = lstCommand[iCommandIndex];
			$scope.safeApply();
		}
		else
		{
			$scope.HandleOutput("No Previous Commands");
		}

	}

	/*
		Event to handle input commands
	*/
	$scope.HandleInputCommandEvent = function(oEvent)
	{
		let iCharCode = oEvent.charCode;

		//if the user pressed enter
		if(iCharCode === 13)
		{
			let sCommand = $scope.oViewBag.sInput;
			$scope.oViewBag.sInput = "";
			$scope.oViewBag.sInputIntellisense = "";
			$scope.HandleInputCommand(sCommand);
			$scope.AddToCommandHistory(sCommand);
		}
		//tab key for auto
		else if(iCharCode === 9)
		{
			//if intellisense has a match
			if($scope.oViewBag.sInputIntellisense !== "")
			{
				//set intellisense to the input
				$scope.oViewBag.sInput = $scope.oViewBag.sInputIntellisense;

				//reset intellisense
				$scope.oViewBag.sInputIntellisense = "";

				//reset the view
				$scope.safeApply();
			}
		}
		//up key
		else if(iCharCode === 38)
		{
			$scope.CommandHistory(true);
		}
		//down key
		else if(iCharCode === 40)
		{
			$scope.CommandHistory(false);
		}
		//random keys
		else{/*handled by handleinputchange*/}
	}

	/*
		When the input command field changes - used to avoid angualr 1 key behind on keypress 
	*/
	$scope.HandleInputChangeEvent = function(oEvent)
	{
		$scope.HandleInputChange();
	}

	/*
		When a key has been pressed
	*/
	$scope.HandleInputChange = function(oEvent)
	{
		//parse the command
		let lstCommand = $scope.oViewBag.sInput.split(" ");

		//if we have two arguments run intellisense
		if(lstCommand.length === 2)
		{
			//get the command name that was typed thus far
			let sCommandNameTypedSoFar = lstCommand[1];

			//try to predict
			let sCommandNamePrediction = dew.PredictCommand(sCommandNameTypedSoFar);

			//if we have a prediction
			if(sCommandNamePrediction)
				$scope.oViewBag.sInputIntellisense = `${lstCommand[0]} ${sCommandNamePrediction}`;
			else
				$scope.oViewBag.sInputIntellisense = "";

		}
		else
		{
			$scope.oViewBag.sInputIntellisense = "";
		}
	}
	
	/*
		Handles input command
	*/
	$scope.HandleInputCommand = function(sCommand)
	{
		let lstArgs = sCommand.split(" ");

		//if we received only 1 argument
		if(lstArgs.length < 1)
			return;
		//if we received at least 2 arguments
		else
		{
			let sAction = lstArgs[0].toLowerCase(); 

			//processing opening scripts
			if(sAction === "o" || sAction === "open")
			{
				//get the command name
				const sCommandName = lstArgs[1];
				let sScriptPath = "";

				//load the script hooks looking for any new scripts
				lstScriptHooks = dew.LoadScripts();

				//find the command name
				let oCommand = lstScriptHooks.find(oScript => 
				{
					return oScript.name === sCommandName;
				});

				//if we found a command match fire the script
				if(oCommand)
				{
					//see if we've got additional arguments
					const sFireArguments = ParseFireArguments(lstArgs);

					//combine the fire and possible firing arguments
					let sFire = oCommand.fire + " " + sFireArguments;

					//fire the process
					let process = exec(sFire, function(error, stdout, stderr)
					{
						if(error) console.log("error: ", error);
						if(stdout) console.log("stdout: ", stdout);
						if(stderr) console.log("stderr: ", stderr);

						//on success notify ui and save execution data
						if(!error)
						{
							$scope.HandleOutput("Script launched", "success", true);
							dew.IncreaseCommandOccurrence(oCommand.name);
						}
					});
				}
				else
				{
					$scope.HandleOutput(`Command '${lstArgs[1]}' not found`, "error");
				}
			}
			else if(sAction == "clr" || sAction === "clear")
			{
				$scope.HandleOutput("");
				$scope.HandleInput("");
			}
			else if(sAction === "ls" || sAction === "scripts")
			{
				let lstScriptName = dew.LoadScriptNames();

				console.log("lstScriptNames: ", lstScriptName);

				if(lstScriptName)
				{
					let sScriptNamesSepByComma = lstScriptName.join(", ");

					console.log("sScriptNamesSepByComma: ", sScriptNamesSepByComma);

					$scope.HandleInput(sScriptNamesSepByComma);
					$scope.HandleOutput("Scripts displaying");
					$scope.safeApply();
				}
				else
				{
					$scope.HandleOutput("Could not load script names", "error");
					$scope.safeApply();
				}

			}
			//create a new script hook in expects, 'n <aliasforload> <path to the file>'
			else if(sAction === "n" || sAction === "new")
			{
				//argument count check
				if(lstArgs.length === 3)
				{
					let oResult = dew.CreateScriptHook(lstArgs[1], lstArgs[2]);

					if(oResult.bResult)
					{
						$scope.HandleOutput(`Script '${lstArgs[1]}' created`, "success");
					}
					else
					{
						if(oResult.sError)
							$scope.HandleOutput(oResult.sError, "error");
						else
							$scope.HandleOutput(`Error creating Script '${lstArgs[1]}', try again`, "error");
					}
				}
				else
				{
					//error output message
					$scope.HandleOutput("in correct number of commands to add a new script use 'n <aliasforload> <path to the file>'");
				}
			}
			//remove a script
			else if(sAction === "r" || sAction === "rm" || sAction === "remove")
			{
				if(lstArgs.length == 2)
				{
					if(lstArgs[1] === "*")
					{
						dew.RemoveAllScripts();
						$scope.HandleOutput("Removed all scripts");
					}
					else
					{

						let bResult = dew.RemoveScriptHook(lstArgs[1]);

						if(bResult)
							$scope.HandleOutput(`Script ${lstArgs[1]} removed`, "success");
						else
							$scope.HandleOutput(`Script ${lstArgs[1]} could not be removed`, "error");

					}
				}
				else
				{
					$scope.HandleOutput("Incorrect number of arguments try - 'r <script to remove>'");
				}
			}
			else
			{
				$scope.HandleOutput(`Command '${lstArgs[0]}' not found`, "error");
			}
		}
	}

	$scope.safeApply = function(fn) {
	  var phase = this.$root.$$phase;
	  if(phase == '$apply' || phase == '$digest') {
	    if(fn && (typeof(fn) === 'function')) {
	      fn();
	    }
	  } else {
	    this.$apply(fn);
	  }
	};

	/*
		Set the input field
	*/
	$scope.HandleInput = function(sMessage)
	{
		$scope.oViewBag.sInput = sMessage;
		$scope.safeApply();
	}

	/*
		Renders output ui
	*/
	$scope.HandleOutput = function(sMessage, sType)
	{
		console.log("sMessage: ", sMessage);
		$scope.oViewBag.sOutputColor = sType == "error" ? "#F33" : sType == "success" ? "#3F3" : "#000";
		$scope.oViewBag.sOutput = sMessage;

		//fade to default color
		setTimeout(function()
		{
			$scope.oViewBag.sOutputColor = "#999";
			$scope.safeApply();
		}, 2000);

		$scope.safeApply();
	}

	/*
		Handle the on drop event with our scope
	*/
	$scope.HandleOnDropEvent = function(sFilePath)
	{
		let sBaseFile = path.parse(path.basename(sFilePath)).name;
		let sInputFormatted = `n ${sBaseFile} ${sFilePath}`;

		$scope.HandleInput(sInputFormatted);
	}

	/*		JQUERY		*/

	/*
		tab key overwrite to route to HandleInputCommand
	*/
	$('#script-input').keydown( function(event) {
		if(event.keyCode == 9) {
		    event.preventDefault();
		    $scope.HandleInputCommandEvent({charCode :9});
		}
		else if(event.keyCode == 38)
		{
			event.preventDefault();
		    $scope.HandleInputCommandEvent({charCode :38});
		}
		else if(event.keyCode == 40)
		{
			event.preventDefault();
		    $scope.HandleInputCommandEvent({charCode : 40});
		}
	});

	/*	Vaninlla */

	/*
		On drag over do nothing
	*/
	document.ondragover = document.ondrop = function(ev)
	{
  		ev.preventDefault();
	}

	/*
		Create a save file string line
	*/
	document.body.ondrop = (ev) => {
		let sFilePath = ev.dataTransfer.files[0].path;

		//create correctly formatted output to create
		$scope.HandleOnDropEvent(sFilePath);

	  	ev.preventDefault();
	}

});

/*		Raw VJS Functions	*/

/*
	Given a list of arguments parse out the firing arguments for the script being called
*/
function ParseFireArguments(lstArgs)
{
	let sFiringArgs = "";

	//remove the firing commnd and the name of the command leaving only firing arguments
	let lstParsedArgs = lstArgs.slice(2, lstArgs.length);

	if(lstParsedArgs.length === 0)
		sFiringArgs = "";
	else
	{
		sFiringArgs = lstParsedArgs.join(" ");
	}

	return sFiringArgs;
}