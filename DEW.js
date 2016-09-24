'use strict';

//file loading
var fs = require("fs-extra");

//dir pathing
var path = require('path')

var DEW = function()
{
	//path to analytics file
	this.COMMAND_ANALYTICS_FILE = path.join("runnables", "commandAnalytics.json");

	//path to runnable scripts file locations
	this.RUNNABLE_SCRIPT_FILE = path.join("runnables", "scriptHooks.json");

	//path to runnable scripts	
	this.RUNNABEL_SCRIPT_DIR = "runnables";

	//app root to be set once
	this.APPLICATION_ROOT = "";
	
	/*
		Set the application root and if directories do not exist create them
	*/
	this.SetRootDir = function(sApplicationRoot)
	{
		this.APPLICATION_ROOT = sApplicationRoot;

		//set other paths
		this.COMMAND_ANALYTICS_FILE = path.join(this.APPLICATION_ROOT, this.COMMAND_ANALYTICS_FILE);
		this.RUNNABLE_SCRIPT_FILE = path.join(this.APPLICATION_ROOT, this.RUNNABLE_SCRIPT_FILE);
		this.RUNNABEL_SCRIPT_DIR = path.join(this.APPLICATION_ROOT, this.RUNNABEL_SCRIPT_DIR);

		//create runnable scripts directory if not eixsts 
		if(!fs.existsSync(this.RUNNABEL_SCRIPT_DIR))
		{
			fs.mkdirSync(this.RUNNABEL_SCRIPT_DIR);
		}

		if(!fs.existsSync(this.RUNNABLE_SCRIPT_FILE))
		{
			fs.writeFileSync(this.RUNNABLE_SCRIPT_FILE, "[]"); 
		}

		if(!fs.existsSync(this.COMMAND_ANALYTICS_FILE))
		{
			fs.writeFileSync(this.COMMAND_ANALYTICS_FILE, "[]"); 
		}

	}

	/*
		return the content of a file
	*/
	this.GetScriptContent = function(sScriptName)
	{
		let sContents = "";
		
		const lstScripts = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));

		const oScriptData = lstScripts.find(_=>_.name === sScriptName);

		if(oScriptData)
		{
			sContents = fs.readFileSync(oScriptData.path, 'utf8');
		}

		return sContents;
	}

	/*
		Load scripts
	*/
	this.LoadScripts = function()
	{
		let lstScripts = [];

		lstScripts = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));

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
		let lstScripts = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));

		let lstScriptWithRemoved = lstScripts.filter(_=>
		{
			if(_.name !== sScriptHookName)
			{
				return true;
			}
			else
			{
				fs.unlink(_.path);
				return false;
			}
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
		Removes all scripts by deleting all filesand overwriting the file completely
	*/
	this.RemoveAllScripts = function()
	{
		let lstScripts = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));
		lstScripts.forEach(_=> {
			try{ fs.unlink(_.path) }catch(e){}
		});
		fs.writeFileSync(this.RUNNABLE_SCRIPT_FILE, JSON.stringify([]));
	}

	/*
		Save a new script to be fired off
		Copy old script into file location an create a new reference in the scriptHooks file
	*/
	this.CreateScriptHook = function(sScriptAlias, sPathToScript)
	{
		let sFileName = path.basename(sPathToScript);
		let lstCurrentCommands = this.LoadScripts();

		if(lstCurrentCommands.find(_=>_.name == sScriptAlias || _.path == sPathToScript))
			return {bResult : false, sError : "Script with that alias or file name already exists"};

		if(sFileName)
		{
			let sExt = sFileName.split(".")[1];
			let sFiringCommand;

			//if we're working with python set the opening command to be 'python'
			if(sExt === "py")
				sFiringCommand = "python";
			//if we're working with anything else just run the path to the file ie open it
			else
				sFiringCommand = "start";
			console.log("(this.RUNNABEL_SCRIPT_DIR: ", (this.RUNNABEL_SCRIPT_DIR));
			console.log("sFileName: ", sFileName);
			let sPath = path.join(this.RUNNABEL_SCRIPT_DIR, sFileName);

			//local windows path
			const sLocalPath = `${this.RUNNABEL_SCRIPT_DIR}/${sFileName}`;

			fs.copySync(path.resolve(sPathToScript), sPath);

			let oNewScript = {
				"name" : sScriptAlias,
				"fire" : `${sFiringCommand} ${sPath}`,
				"command" : "o",
				"path" : sLocalPath
			};

			//load in the command anaylitics file
			let lstScriptHook = JSON.parse(fs.readFileSync(this.RUNNABLE_SCRIPT_FILE));

			lstScriptHook.push(oNewScript);

			fs.writeFileSync(this.RUNNABLE_SCRIPT_FILE, JSON.stringify(lstScriptHook));

			return {bResult : true};
		}
		else
			return {bResult : false};
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
		Predict a command from history of fully entered commands
	*/
	this.PredictCommandFromHistory = function(sCommand, lstPreviousFullyEnteredCommands)
	{
		let lstPreviousCommandMatch = lstPreviousFullyEnteredCommands.filter(_=> _.indexOf(sCommand) !== -1);

		if(lstPreviousCommandMatch.length > 0)
			return lstPreviousCommandMatch[0];
		else
			return "";
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

/*
	Smaller logger class 
*/
var Logger = function()
{
	//logger file location
	this.LOG_LOCATION = "./data/log.txt";
	
	/*
		Log to logging file
	*/
	this.FLog = function(sContent)
	{
		const sDate = this.FormatDate();
		const sFormmattedOutput = `${sDate} ::: ${sContent}\n`;
		fs.appendFile(this.LOG_LOCATION, sFormmattedOutput);
	}

	/*
		Stupid date formatting should just use moment
	*/
	this.FormatDate = function()
	{
	    var date = new Date();
	    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
	    return str;
	}
}

module.exports.Logger = Logger;
module.exports.DEW = DEW;
