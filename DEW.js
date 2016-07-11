'use strict';

//file loading
var fs = require("fs-extra");

//dir pathing
var path = require('path')

var DEW = function()
{
	//path to analytics file
	this.COMMAND_ANALYTICS_FILE = "./data/commandAnalytics.json";

	//path to runnable scripts file locations
	this.RUNNABLE_SCRIPT_FILE = "./runnables/scriptHooks.json";

	//path to runnable scripts	
	this.RUNNABLE_SCRIPT_DIR = "./runnables";

	/*
		Load scripts
	*/
	this.LoadScripts = function()
	{
		let lstScripts = [];

		lstScripts = JSON.parse(fs.readFileSync(path.join(__dirname, this.RUNNABLE_SCRIPT_FILE)));

		return lstScripts;
	}

	/*
		Load all script names
	*/
	this.LoadScriptNames = function()
	{
		let lstScripts = this.LoadScripts();

		let lstScriptName = lstScripts.map(_=> _.name);

		return lstScriptName;
	}

	/*
		Remove a script based on it's name
	*/
	this.RemoveScriptHook = function(sScriptHookName)
	{
		let lstScripts = JSON.parse(fs.readFileSync(path.join(__dirname, this.RUNNABLE_SCRIPT_FILE)));

		let lstScriptWithRemoved = lstScripts.filter(_=>
		{
			return _.name !== sScriptHookName;
		});

		if(lstScriptWithRemoved.length != lstScripts.length)
		{
			fs.writeFileSync(this.RUNNABLE_SCRIPT_FILE, JSON.stringify(lstScriptWithRemoved));
			return true;
		}
		else
			return false;
	}

	/*
		Save a new script to be fired off
		Copy old script into file location an create a new reference in the scriptHooks file
	*/
	this.CreateScriptHook = function(sScriptAlias, sPathToScript)
	{

		let sFileName = path.basename(sPathToScript);

		if(sFileName)
		{
			let sExt = sFileName.split(".")[1];
			let sFiringCommand;

			if(sExt === "py")
				sFiringCommand = "python";

			let oNewScript = {
				"name" : sScriptAlias,
				"fire" : `${sFiringCommand} runnables/${sFileName}`,
				"command" : "o"
			};

			fs.copySync(path.resolve(sPathToScript), path.resolve(__dirname, this.RUNNABLE_SCRIPT_DIR, sFileName));

			//load in the command anaylitics file
			let lstScriptHook = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));

			lstScriptHook.push(oNewScript);

			fs.writeFileSync(this.RUNNABLE_SCRIPT_FILE, JSON.stringify(lstScriptHook));

			return true;
		}
		else
			return false;
	}

	/*
		Predict a command based on subtext
	*/
	this.PredictCommand = function(sCommandTypedSoFar)
	{
		let lstCommandOccurrence = JSON.parse(fs.readFileSync(this.COMMAND_ANALYTICS_FILE));

		//occurrence match on each name
		let iMaxLetterCount = 0;
		let oCommandIteratee;

		//for each command figureout which most matches the currently typed command
		lstCommandOccurrence.forEach(oCommand => 
		{
			//the letter count of this command given a substring match
			let iLetterCount = 0;

			//if the command typed so far is in this command
			if(oCommand.name.indexOf(sCommandTypedSoFar) != -1)
			{
				iLetterCount = sCommandTypedSoFar.length;

				//if we have a previous command 
				if(oCommandIteratee)
				{
					//if the letter count of the previous command is less than this one - set this one
					if(iMaxLetterCount < iLetterCount)
					{
						oCommandIteratee = oCommand;
						iMaxLetterCount = iLetterCount;	
					}
					//if the letter count matches and if the occurrence of the looping command is greater than the one we currently have, overwrite it
					else if(iMaxLetterCount === iMaxLetterCount &&
							oCommand.occurrence > oCommandIteratee.occurrence)
					{
						oCommandIteratee = oCommand;
						iMaxLetterCount = iLetterCount;
					}
					//the number ofcharacters of this command does not exceed the previous - do not reset it
					else{}
				}
				//found our first command match based on sub str - set our iteratee and set the length of our sub str
				else
				{
					oCommandIteratee = oCommand;
					iMaxLetterCount = iLetterCount;
				}
			}
		});

		if(oCommandIteratee)
			return oCommandIteratee.name;
		else
			return undefined;
	}

	/*
		Get list of command occurrence
	*/
	this.GetCommandOccurrence = function()
	{
		//load in the command anaylitics file
		let lstCommandOccurrence = JSON.parse(fs.readFileSync(this.COMMAND_ANALYTICS_FILE));
		return lstCommandOccurrence;	
	}

	/*
		Increase the occurrence of this command by it's name
	*/
	this.IncreaseCommandOccurrence = function(sCommandName)
	{
		//load in the command anaylitics file
		let lstCommandOccurrence = JSON.parse(fs.readFileSync(this.COMMAND_ANALYTICS_FILE));

		//attempt to find this command in our analytics
		let oElement = lstCommandOccurrence.find(oCommand =>
		{
			return oCommand.name === sCommandName;
		});

		//if it exists increment the occurrence
		if(oElement)
			oElement.occurrence++;	
		//if it does not exist create a new json object that represents the occurrence of this command
		else
		{
			//create new object
			let oNewCommandOccurrence = {
				"occurrence" : 1,
				"name" : sCommandName
			};

			//add to list
			lstCommandOccurrence.push(oNewCommandOccurrence);
		}

		//overwrite file
		try{
			fs.writeFileSync(this.COMMAND_ANALYTICS_FILE, JSON.stringify(lstCommandOccurrence));
		} catch(e)
		{
			console.log("e: ", e);
		}
	}
}

module.exports.DEW = DEW;