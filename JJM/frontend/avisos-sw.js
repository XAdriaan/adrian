self.addEventListener('push',event=>{
 let d={};try{d=event.data?.json()||{};}catch(_){}
 event.waitUntil(self.registration.showNotification(d.title||'JJM · Sala general',{body:d.body||'La reunión programada ya comenzó.',tag:d.tag||'jjm-general',icon:'/img/logo-jjm-v36.svg',data:{url:'/reunion.html?general=1'},actions:[{action:'entrar',title:'Entrar a la reunión'}]}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow('/reunion.html?general=1'));});
