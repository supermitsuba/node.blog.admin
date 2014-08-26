var express = require('express');
var fs = require('fs');
var azure = require('azure');
var path = require('path');
var und = require('underscore');
require('./.config');

var ac = process.env.AzureAccountName;
var akey = process.env.AzureAccountKey;

console.log(ac);

var retryOperations = new azure.ExponentialRetryPolicyFilter();
var tableService = azure.createTableService(ac, akey).withFilter(retryOperations);

var app = express();

var paths = {
	views: path.join(__dirname, '/views/'),
	public: path.join(__dirname, '/public/'),
	partials: path.join(__dirname, '/partial/')
};

console.log(paths);
app.use(express.static( paths.public ));
app.use(express.bodyParser());
console.log(app.locals);

app.get('/',
	function (req, res) {
	    
	    var template = fs.readFileSync(__dirname + '/articleInsert.html', 'utf8');
	    res.send(template);
		res.end;
	}
);

app.get('/articles', function(req,res){

	 ReturnEntities(req, res, 'article');
});

app.get('/events', function(req,res){
	 ReturnEntities(req, res, 'event');
});

app.get('/comments', function(req, res){
	ReturnEntities(req, res, 'comments');
});

app.get('/comments/:PartitionKey', function(req,res){

	var query = azure.TableQuery
                     .select()
                     .from('comments')
                     .where('PartitionKey eq ?',[req.params.PartitionKey]);
	tableService.queryEntities(query, function(error, entities){    if (this.debug) console.log('Got Connection ');
        	if (error) {
	            	return;
        	}

		res.send(entities);
		res.end;
    	});
});

app.delete('/comments/:PartitionKey/:RowKey', function(req,res){
	var obj ={
		'PartitionKey':req.params.PartitionKey,
		'RowKey':req.params.RowKey
	};

	tableService.deleteEntity('comments', obj, function(error){    if (this.debug) console.log('Got Connection ');
        	if (error) {
	            	throw error;
        	}

		res.send({'PartitionKey':obj.PartitionKey, 'RowKey':obj.RowKey});
		res.end;
    	});
});

app.post('/articles', function(req,res){
	insertOrUpdate(req, res, req.body.RowKey);
});

app.put('/articles',function(req, res){
	insertOrUpdate(req, res, Date.now()+'');

});

app.post('/events', function(req,res){
	insertOrUpdateEvents(req, res, req.body.RowKey);
});

app.put('/events',function(req, res){
	insertOrUpdateEvents(req, res, Date.now());

});

app.get('/all', function(req, res){
	var results = [];

	var obj = [
	{
		'func': GetEntities,
		'table': 'article',
	},
	{
		'func': GetEntities,
		'table': 'event',
	},
	{
		'func': GetEntities,
		'table': 'comments',
	},
	];

	und.each(obj, function(o){
		o.func(req, res, o.table, function(data){ 
			results.push({'Items':data});
			if(obj.length == results.length)
			{
				res.setHeader("Content-Disposition","attachment; filename="+ISODateString(new Date())+".json");
				res.send(JSON.stringify(results));
				res.end;
			}
		})
	});
});

function ISODateString(d){
  function pad(n){return n<10 ? '0'+n : n}
  return d.getUTCFullYear()+''
      + pad(d.getUTCMonth()+1)+''
      + pad(d.getUTCDate())+''
      + pad(d.getUTCHours())+''
      + pad(d.getUTCMinutes())+''
      + pad(d.getUTCSeconds())+''
}


app.listen(8089);

function insertOrUpdateEvents(req, res, RowId){
	var date = new Date(req.body.DateOfEvent);
	var events = {
		PartitionKey: RowId+'',
		RowKey: RowId+'',
		WebLink:req.body.WebLink,
		EventDate: (1+date.getMonth())+'/'+date.getDate(),//short
		EventName:req.body.EventName,
		DateOfEvent:req.body.DateOfEvent,
		Sort:1
	};

	var q = tableService.insertOrReplaceEntity('event', events, function(error){
		if(!error){
			console.log('success');
		}
		else{
			console.log('error: '+error);
	            	throw error;
		}

		res.send("");
		res.end;
	});
}

function insertOrUpdate(req, res, RowId){
	var article = {
		PartitionKey: req.body.CategoryType,
		RowKey: RowId,
		DateOfArticle: req.body.DateOfArticle,
		Title: req.body.Title,
		AuthorName: req.body.Author,
		Summary: req.body.Summary,
		Post: req.body.Post,
		IsDisabled: "0",
		IsCommentEnabled:req.body.IsCommentEnabled
	};

	var q = tableService.insertOrReplaceEntity('article', article, function(error){
		if(!error){
			console.log('success');
		}
		else{
			console.log('error: '+error);
	            	throw error;
		}

		res.send("");
		res.end;
	});
}

function GetEntities(req, res, tableName, callback){
var query = azure.TableQuery
                     .select()
                     .from(tableName);
	tableService.queryEntities(query, function(error, entities){    
		if (this.debug) console.log('Got Connection ');
        	if (error) {
	            	throw error;
        	}
	
			callback(entities);
    	});
}

function ReturnEntities(req, res, tableName){
	GetEntities(req, res, tableName, function(data){
		res.send(data);
		res.end;
    	});
}
