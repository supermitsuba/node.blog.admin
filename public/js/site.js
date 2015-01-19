var controller = (
	function(){
		//private variables and functions
    	var instance;
    	var dataDictionary = [];

    	function init(){
    		return {
    			GetKey:function(key){
    				return dataDictionary[key];
    			},

    			//public variables and functions
    			Get:function(templateURL, getUrl, successCB, errCB, useCache){
    				if(!useCache && dataDictionary[getUrl] != null)
    				{
    					return dataDictionary[getUrl];
    				}

    				$.ajax({
						type:'GET',
						url:getUrl,
					}).done(function(data){
    					var dataTemplate = new EJS({ url: templateURL }).render({data:data});
    					dataDictionary[getUrl] = data;
    					successCB(dataTemplate);
					}).fail(errCB);
    			},
    			Insert:function(data, getUrl, successCB, errCB){
    				$.ajax({
						type:'PUT',
						data:data,
						url:getUrl,
					}).done(function(){
						successCB();
						dataDictionary[getUrl].push(data);
					}).fail(errCB);
    			},
    			Update:function(data, getUrl, successCB, errCB){
    				$.ajax({
						type:'POST',
						data:data,
						url:getUrl,
					}).done(function(){
						successCB();
						dataDictionary[getUrl] = null;//may want to change this to update that item
					}).fail(errCB);
    			},
    			Delete:function(deleteUrl, successCB, errCB){
    				$.ajax({
						type:'DELETE',
						url:getUrl,
					}).done(function(data){
						dataDictionary[deleteUrl] = null;//may want to change this to delete a specific item
					})
					  .fail(errCB);
    			}

    		}
    	}

		return{
			GetInstance:function(){
		        if(instance == null)
		        {
		            instance = init();
		        }

		        return instance;
		    }
		}
	}
)();


var instance = null;

$(function(){

	instance = controller.GetInstance();
	instance.Get('/partial/articles.ejs', '/articles', GetArticlesDone, InsertFail, true);

	$('#submit').on('click',function(event){
		var article = getArticleObject();
		if(article.RowKey == -1)
		{
			instance.Insert(article, '/articles', ToggleEdit, InsertFail);
		}
		else{
			instance.Update(article, '/articles', ToggleEdit, InsertFail);
		}
	});

	$('#newArticle').on('click', function(){

		setArticleObject({
			RowKey:'-1',
			CategoryType:'',
			DateOfArticle:'',
			Title:'',
			Author:'',
			Summary:'',
			Post:'',
			IsCommentEnabled:"1" 
		});

		ToggleEdit();
	});

	$('#newEvents').on('click', function(){
		setEventObject({
			RowKey:'-1',
			PartitionKey:'',
			WebLink:'',
			EventName:'',
			DateOfEvent:''
		});

		ToggleEditEvent();
	});

	$('#viewEvents').on('click', function(){
		$('table.event tbody').empty();
		instance.Get('/partial/events.ejs', '/events', GetEventsDone, InsertFail, true);
	});

	$('#cancelEvents').on('click', ToggleEvents);

	$('#viewComments').on('click', function(){

		instance.Get('/partial/comments.ejs', '/comments/'+$('#RowKey').val(), GetCommentsDone, InsertFail, true);
	});

	$('#export').on('click', function(){
			$.when(
					$.ajax({
						type:'GET',
						url:'/articles',
					}),
					$.ajax({
						type:'GET',
						url:'/comments',
					}),
					$.ajax({
						type:'GET',
						url:'/events',
					})
			).done(function(data1, data2, data3){
				var results = {
					'Articles': data1,
					'Comments': data2,
					'Events':data3
				};

				var object = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(results));
				window.open(object, '_self', '');
			});
	});

	$('#cancelComment').on('click', ToggleComments);

	$('#cancelArticle').on('click', ToggleEdit);

	$('#cancelEvent').on('click', ToggleEditEvent);

	$('#submitEvent').on('click',function(event){
		var events = getEventObject();
		if(events.RowKey == -1)
		{
			instance.Insert(events, '/events', ToggleEditEvent, InsertFail);
		}
		else{
			instance.Update(events, '/events', ToggleEditEvent, InsertFail);
		}
	});
});

function GetEventsDone(template){
	ToggleEvents();
	var table = $('table.event tbody');
	table.append(template);

	$('input.edit-events').on('click', function(){
		var id = $(this).data('id');
		var category = $(this).data('category');
		
		var item = _.find(instance.GetKey('/events'), function(item){
			return item.RowKey == id && item.PartitionKey == category;
		});

		setEventObject(item);
		ToggleEditEvent();
	});
}

function GetCommentsDone(template){
	var table = $('table.comments tbody');
	table.empty();
	table.append(template);

	$('input.delete-comments').on('click', function(){
		var id = $(this).data('id');
		var category = $(this).data('category');
		
		instance.Delete('/comments/'+category+'/'+id, DeleteComment, InsertFail);
	});

	ToggleComments();
}

function DeleteComment(data){
	$('table.comments input[data-id="'+data.RowKey+'"][data-category="'+data.PartitionKey+'"]')
		.parent()
		.parent()
		.remove();
}

function GetArticlesDone(template){
	var table = $('.article tbody');
	table.append(template);

	$('input.edit').on('click', function(){
		var id = $(this).data('id');
		var category = $(this).data('category');
		var item = _.find(instance.GetKey('/articles'), function(item){
			return item.RowKey == id && item.PartitionKey == category;
		});

		setArticleObject(item);
		ToggleEdit();
	});
}

function ToggleComments()
{
	$('div.edit-article').toggleClass('hide');
	$('div.edit-comments').toggleClass('hide');
}

function ToggleEdit()
{
	$('div.edit-article').toggleClass('hide');
	$('table.article').parent().toggleClass('hide');
}

function ToggleEvents(){
	$('div.view-events').toggleClass('hide');
	$('table.article').parent().toggleClass('hide');
}

function ToggleEditEvent()
{
	$('div.view-events').toggleClass('hide');
	$('div.edit-events').toggleClass('hide');
}

function getArticleObject()
{
	return {
			RowKey:$('#RowKey').val(),
			CategoryType:$('#CategoryType').val()+"".trim(),
			DateOfArticle:$('#DateOfArticle').val()+"".trim(),
			Title:$('#Title').val()+"".trim(),
			Author:$('#Author').val()+"".trim(),
			Summary:$('#Summary').val()+"".trim(),
			Post:$('#Post').val()+"".trim(),
			IsCommentEnabled:$('#isCommentEnabled').is(':checked')? "1" : "0" 
		};
}

function getEventObject(){
	return {
		RowKey:$('#RowKey').val(),
		PartitionKey:$('#PartitionKey').val(),
		WebLink:$('#WebLink').val(),
		EventName:$('#EventName').val(),
		DateOfEvent:$('#DateOfEvent').val()
	};
}

function setEventObject(event){
	$('#RowKey').val(event.RowKey);
	$('#PartitionKey').val(event.PartitionKey);
	$('#WebLink').val(event.WebLink);
	$('#EventName').val(event.EventName);
	$('#DateOfEvent').val(event.DateOfEvent);
}

function setArticleObject(article)
{
	$('#RowKey').val(article.RowKey);
	$('#CategoryType').val(article.PartitionKey);
	$('#DateOfArticle').val(article.DateOfArticle);
	$('#Title').val(article.Title);
	$('#Author').val(article.AuthorName);
	$('#Summary').val(article.Summary);
	$('#Post').val(article.Post);
	if( article.IsCommentEnabled == "1")
	{
		$('#isCommentEnabled').attr('checked','checked');
	}
	else{
		$('#isCommentEnabled').attr('checked','false');
	}
}

function InsertFail(){
	alert('there was an error.');
}
