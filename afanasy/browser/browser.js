g_cycle = 0;
g_last_msg_cycle = g_cycle;
g_id = 0;
g_uids = [0];
/*g_name = 'web';
g_version = 'browser';
g_user_name = "jimmy";
g_host_name = "pc01";*/

g_windows = [];
g_recievers = [];
g_refreshers = [];
g_monitors = [];
g_cur_monitor = null;
g_main_monitor = null;
g_monitor_buttons = [];

g_HeaderOpened = false;
g_FooterOpened = false;

g_Images = [];

function g_RegisterSend()
{
	if( g_id != 0)
		return;

	var obj = {};
	obj.monitor = {};
	obj.monitor.name = localStorage["name"];
	obj.monitor.user_name = localStorage['user_name'];
	nw_Send(obj);

	setTimeout("g_RegisterSend()", 5000);
}

function g_ProcessMsg( obj)
{
//g_Info( g_cycle+' Progessing '+g_recievers.length+' recieves');
	g_last_msg_cycle = g_cycle;

	if( obj.files && obj.path )
	{
		for( var i = 0; i < obj.files.length; i++)
		{
			var img = new Image();
			img.src = obj.path + "/" + obj.files[i];
			g_Images.push( img);
		}
		return;
	}

	if( obj.id != null )
	{
		if(( g_id == 0 ) && ( obj.id > 0 ))
		{
			// Monitor is not registered and recieved an ID:
			g_RegisterRecieved( obj);
		}
		else if( obj.id != g_id )
		{
			// Recieved ID does not match:
			g_Deregistered();
		}
		return;
	}

	if( obj.message )
	{
		g_ShowMessage( obj.message);
		return;
	}
	if( obj.object )
	{
		g_ShowObject( obj.object);
		return;
	}
	if( obj.task_exec )
	{
		g_ShowObject( obj.task_exec);
		return;
	}

	if( g_id == 0 )
		return;

	for( i = 0; i < g_recievers.length; i++)
	{
		g_recievers[i].processMsg( obj);
	}
}

function g_Refresh()
{
	if(( g_last_msg_cycle != null ) && ( g_last_msg_cycle < g_cycle - 10 ))
		g_ConnectionLost();

	g_cycle++;
	setTimeout("g_Refresh()", 1000);

	if( g_id == 0 )
		return;

	nw_GetEvents('monitors','events');

	for( i = 0; i < g_refreshers.length; i++)
	{
		g_refreshers[i].refresh();
	}
}

function g_Init()
{
	window.onbeforeunload = g_OnClose;
	document.body.onkeydown = g_OnKeyDown;

	nw_GetSoftwareIcons();

	localStorage["name"] = 'webgui';
	localStorage["host_name"] = "pc";
	g_SetUserName();

	var header = document.getElementById('header');
	g_monitor_buttons = header.getElementsByClassName('mbutton');
	for( var i = 0; i < g_monitor_buttons.length; i++)
		g_monitor_buttons[i].onclick = function(e){return g_MButtonClicked(e.currentTarget.textContent,e);};

	g_RegisterSend();
	g_Refresh();
}

function g_RegisterRecieved( i_obj)
{
	g_id = i_obj.id;
	g_Info('Registed: ID = '+g_id+' User = "'+localStorage['user_name']+'"');
	g_MButtonClicked('jobs');
}

function g_Deregistered()
{
//g_Info('Deregistered.');
	g_id = 0;
	g_CloseAllMonitors();
	g_RegisterSend();
}

function g_ConnectionLost()
{
	g_Info('Connection Lost.');
	g_Deregistered();
}

function g_MButtonClicked( i_type, i_evt)
{
	for( var i = 0; i < g_monitor_buttons.length; i++)
		if( g_monitor_buttons[i].textContent == i_type )
			if( g_monitor_buttons[i].classList.contains('pushed'))
				return;
			else
				g_monitor_buttons[i].classList.add('pushed');

	var new_wnd = true;
	if( i_evt )
	{
		if( i_evt.shiftKey ) new_wnd = false;
		if( i_evt.ctrlKey ) new_wnd = false;
		if( i_evt.altKey ) new_wnd = false;
	}
	else
		new_wnd = false;

	g_OpenMonitor( i_type, new_wnd);
}

function g_MonitorClosed( i_name)
{
	for( var i = 0; i < g_monitor_buttons.length; i++)
		if( g_monitor_buttons[i].textContent == i_name )
			g_monitor_buttons[i].classList.remove('pushed');
}

function g_OpenMonitor( i_type, i_new_wnd, i_id, i_name)
{
	if( i_name == null )
		i_name = i_type;

	for( var i = 0; i < g_monitors.length; i++)
		if( g_monitors[i].name == i_name )
		{
			g_Error('Monitor "'+i_name+'" already opened.');
			return;
		}

	var doc = document;
	var elParent = document.getElementById('content');
	var wnd = null;
	if( i_new_wnd )
	{
		wnd = g_OpenWindow( i_name);
		if( wnd == null ) return;
		doc = wnd.document;
		elParent = doc.body;
	}
	else if( g_main_monitor )
		g_main_monitor.destroy();

	var monitor = new Monitor( doc, elParent, i_type, i_id, i_name);

	if( i_new_wnd )
	{
		wnd.monitor = monitor;
		wnd.onbeforeunload = function(e){e.currentTarget.monitor.destroy()};
	}
	else
		g_main_monitor = monitor;

	return monitor;
}
function g_OpenTasks( i_job_name, i_job_id) { g_OpenMonitor('tasks', true, i_job_id, i_job_name);}

function g_CloseAllMonitors()
{
	cgru_ClosePopus();

//	for( var i = 0; i < g_monitor_buttons.length; i++)
//		g_monitor_buttons[i].classList.remove('pushed');

	while( g_monitors.length > 0 )
		g_monitors[0].destroy();
}

function g_ShowMessage( msg)
{
	if( msg.list == null ) return;
	var name = msg.name+'_'+msg.type;
	var title = msg.name+':'+msg.type;
	var wnd = g_OpenWindow( name, title);
	if( wnd == null ) return;
	for( i = 0; i < msg.list.length; i++)
		wnd.document.write('<div>'+((msg.list[i]).replace(/\n/g,'<br/>'))+'</div>');
}

function g_ShowObject( obj)
{
	var title = 'Object';
	if( obj.name ) title = obj.name;
	var wnd = g_OpenWindow( title, title);
	if( wnd == null ) return;
	var obj_str = JSON.stringify( obj, null, '&nbsp&nbsp&nbsp&nbsp');
	wnd.document.write( obj_str.replace(/\n/g,'<br/>'));
}

function g_OpenWindow( i_name, i_title, i_focus )
{
	if( i_title == null )
		i_title = i_name;

	for( var i = 0; i < g_windows.length; i++)
		if( g_windows[i].name == i_name )
			if( i_focus )
			{
				g_windows[i].focus();
				return;
			}
			else
			{
				g_windows[i].close();
			}

	var wnd = window.open( null, i_name, 'location=no,scrollbars=yes,resizable=yes,menubar=no');
	if( wnd == null )
	{
		g_Error('Can`t open new browser window.');
		return;
	}

	g_windows.push( wnd);
	wnd.name = i_name;

	wnd.document.writeln('<!DOCTYPE html>');
	wnd.document.write('<html><head><title>'+i_title+'</title>');
	wnd.document.write('<link type="text/css" rel="stylesheet" href="lib/styles.css">');
	wnd.document.write('<link type="text/css" rel="stylesheet" href="afanasy/browser/style.css">');
	wnd.document.write('</head><body></body></html>');
	wnd.document.body.onkeydown = g_OnKeyDown;
	wnd.focus();

	return wnd;
}

function g_CloseAllWindows()
{
	for( var i = 0; i < g_windows.length; i++)
		g_windows[i].close();
}

function g_HeaderButtonClicked()
{
	var header = document.getElementById('header');
	var button = document.getElementById('headeropenbutton');
	if( g_HeaderOpened )
	{
		header.style.top = '-200px';
		button.innerHTML = '&darr;';
		g_HeaderOpened = false;
	}
	else
	{
		header.style.top = '0px';
		button.innerHTML = '&uarr;';
		g_HeaderOpened = true;
	}
}
function g_FooterButtonClicked()
{
	var footer = document.getElementById('footer');
	var button = document.getElementById('footeropenbutton');
	if( g_FooterOpened )
	{
		footer.style.bottom = '-200px';
		button.innerHTML = '&uarr;';
		document.getElementById('log_btn').classList.remove('pushed');
		document.getElementById('netlog_btn').classList.remove('pushed');
		document.getElementById('log').style.display = 'none';
		document.getElementById('netlog').style.display = 'none';
		document.getElementById('log_btn').style.display = 'none';
		document.getElementById('netlog_btn').style.display = 'none';
		g_FooterOpened = false;
	}
	else
	{
		footer.style.bottom = '0px';
		button.innerHTML = '&darr;';
		document.getElementById('log_btn').classList.add('pushed');
		document.getElementById('log').style.display = 'block';
		document.getElementById('log_btn').style.display = 'block';
		document.getElementById('netlog_btn').style.display = 'block';
		g_FooterOpened = true;
	}
}
function g_LogButtonClicked( i_type)
{
	var btn_log = document.getElementById('log_btn');
	var btn_net = document.getElementById('netlog_btn');
	var log = document.getElementById('log');
	var netlog = document.getElementById('netlog');
	if( i_type == 'log' )
	{
		btn_log.classList.add('pushed');
		btn_net.classList.remove('pushed');
		log.style.display = 'block';
		netlog.style.display = 'none';
	}
	else
	{
		btn_net.classList.add('pushed');
		btn_log.classList.remove('pushed');
		netlog.style.display = 'block';
		log.style.display = 'none';
	}
}
function g_Log( i_msg, i_log)
{
	if( i_log == null ) i_log = 'log';
	var log = document.getElementById( i_log);
	var lines = log.getElementsByTagName('div');
	if( lines.length && ( i_msg == lines[0].msg ))
	{
		var count = lines[0].msg_count + 1;
		var msg = '<i>'+g_cycle+' x'+count+':</i> '+i_msg;
		lines[0].innerHTML = msg;
		lines[0].msg_count = count;
		return;
	}

	var line = document.createElement('div');
	line.msg = i_msg;
	line.msg_count = 1;
	var msg = '<i>'+g_cycle+':</i> '+i_msg;
	line.innerHTML = msg;
	log.insertBefore( line, lines[0]);
	if( lines.length > 100 )
		log.removeChild( lines[100]);
}
function g_Info( i_msg, i_log)
{
	document.getElementById('info').textContent=i_msg;
	if( i_log == null || i_log == true )
		g_Log( i_msg);
}
function g_Error( i_err)
{
	g_Info('Error: ' + i_err);
}

function g_OnClose()
{
	var operation = {};
	operation.type = 'deregister';
	if( g_id)
		nw_Action('monitors', [g_id], operation);
	g_CloseAllWindows();
	g_CloseAllMonitors();
}

function g_OnKeyDown(e)
{
	if(!e) return;
	if(e.keyCode==27) // ESC
	{
		for( var i = 0; i < g_monitors.length; i++)
		{
			g_monitors[i].selectAll( false);
		}
		cgru_ClosePopus();
		return;
	}

	if( cgru_DialogsAll.length || cgru_MenusAll.length ) return;

	if(e.keyCode==65 && e.ctrlKey) // CTRL+A
	{
		if( g_cur_monitor) g_cur_monitor.selectAll( true);
		return false;
	}
	else if((e.keyCode==38) && g_cur_monitor) g_cur_monitor.selectNext( e, true ); // UP
	else if((e.keyCode==40) && g_cur_monitor) g_cur_monitor.selectNext( e, false); // DOWN
//	else if(evt.keyCode==116) return false; // F5
//document.getElementById('test').textContent='key down: ' + e.keyCode;
//	return true; 
}

function g_SetUserNameButton() { g_SetUserNameDialog();}
function g_SetUserNameDialog()
{
	new cgru_Dialog( document, document.body, window, 'g_SetUserName', 'user_name', 'str', '', 'settings', 'Set User Name', 'You should restart GUI<br/>Just refresh browser');
}
function g_SetUserName( i_parameter, i_value)
{
	var value = null;
	if( i_value && i_value.length )
		value = i_value;
	if( value == null )
		value = localStorage['user_name'];
	if( value == null )
	{
		g_SetUserNameDialog()
		return;
	}

	localStorage['user_name'] = value;
	g_Info('User name set to "'+value+'"');
	document.getElementById('username').textContent = value;
}
function g_LocalStorageShow() { g_ShowObject( localStorage);}
function g_LocalStorageClearClicked()
{
	new cgru_Dialog( document, document.body, window, 'g_LocalStorageClear', 'local_storage_clear', 'str', '', 'settings', 'Clear Local Storage', 'Are You Sure?<br/>Type "yes".');
}
function g_LocalStorageClear( i_name, i_value)
{
	if( i_name && i_value )
		if( i_value != 'yes' )
			return;
	localStorage.clear();
	g_Info('Local Storage Cleared.');
	g_SetUserName();
}
