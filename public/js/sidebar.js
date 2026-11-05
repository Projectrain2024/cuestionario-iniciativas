(function(){
  var currentPath = window.location.pathname;

  var sidebarHTML = '<nav class="app-sidebar" id="appSidebar">'
    + '<div class="sb-toggle" id="sbToggle" title="Menú">☰</div>'
    + '<div class="sb-head">MÓDULOS</div>'
    + '<ul class="sb-nav">'
    + '  <li><a href="/"' + (currentPath === '/' ? ' class="sb-active"' : '') + '>'
    + '    <span class="sb-icon">🏢</span><span class="sb-label">Mesas de Trabajo</span>'
    + '  </a></li>'
    + '  <li class="sb-group' + (currentPath.indexOf('/shark-tank') === 0 ? ' sb-open' : '') + '">'
    + '    <a href="#" class="sb-parent">'
    + '      <span class="sb-icon">🦈</span><span class="sb-label">Shark Tank</span>'
    + '      <span class="sb-arrow">▶</span>'
    + '    </a>'
    + '    <ul class="sb-sub">'
    + '      <li><a href="/shark-tank/admin"' + (currentPath === '/shark-tank/admin' || currentPath === '/shark-tank/admin/' || currentPath === '/shark-tank' ? ' class="sb-active"' : '') + '>'
    + '        <span class="sb-dot"></span><span class="sb-label">Eventos</span>'
    + '      </a></li>'
    + '      <li><a href="/shark-tank/admin/participantes-results"' + (currentPath === '/shark-tank/admin/participantes-results' ? ' class="sb-active"' : '') + '>'
    + '        <span class="sb-dot"></span><span class="sb-label">Participantes</span>'
    + '      </a></li>'
    + '      <li><a href="/shark-tank/admin/panel-results"' + (currentPath === '/shark-tank/admin/panel-results' ? ' class="sb-active"' : '') + '>'
    + '        <span class="sb-dot"></span><span class="sb-label">Panel / Rúbrica</span>'
    + '      </a></li>'
    + '    </ul>'
    + '  </li>'
    + '</ul>'
    + '<div class="sb-foot"><a href="/logout"><span class="sb-icon">🚪</span><span class="sb-label">Cerrar sesión</span></a></div>'
    + '</nav>';

  var sidebarCSS = ''
    + '.app-sidebar{position:fixed;top:0;left:0;width:220px;height:100vh;background:#2D1140;color:#fff;display:flex;flex-direction:column;z-index:9000;transition:transform .25s ease}'
    + '.sb-toggle{display:none;position:fixed;top:12px;left:12px;z-index:9001;width:38px;height:38px;border-radius:10px;background:#2D1140;color:#fff;border:none;font-size:20px;cursor:pointer;line-height:38px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}'
    + '.sb-head{padding:20px 16px 10px;font:600 11px/1 "DM Sans",sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,.4);border-bottom:1px solid rgba(255,255,255,.08)}'
    + '.sb-nav{list-style:none;padding:6px 0;flex:1;overflow-y:auto}'
    + '.sb-nav a{display:flex;align-items:center;gap:10px;padding:11px 16px;color:rgba(255,255,255,.7);text-decoration:none;font:500 14px "DM Sans",sans-serif;border-left:3px solid transparent;transition:background .15s,color .15s}'
    + '.sb-nav a:hover{background:rgba(255,255,255,.07);color:#fff}'
    + '.sb-nav a.sb-active{background:rgba(255,255,255,.1);color:#fff;border-left-color:#E9A020}'
    + '.sb-icon{font-size:17px;width:22px;text-align:center;flex-shrink:0}'
    + '.sb-arrow{margin-left:auto;font-size:10px;opacity:.4;transition:transform .2s}'
    + '.sb-group.sb-open>.sb-parent .sb-arrow{transform:rotate(90deg);opacity:.7}'
    + '.sb-sub{list-style:none;max-height:0;overflow:hidden;transition:max-height .25s ease;background:rgba(0,0,0,.15)}'
    + '.sb-group.sb-open .sb-sub{max-height:200px}'
    + '.sb-sub a{padding:9px 16px 9px 48px;font-size:13px;border-left:none}'
    + '.sb-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.25);flex-shrink:0}'
    + '.sb-sub a:hover .sb-dot,.sb-sub a.sb-active .sb-dot{background:#E9A020}'
    + '.sb-foot{padding:12px 16px;border-top:1px solid rgba(255,255,255,.08)}'
    + '.sb-foot a{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.45);text-decoration:none;font:500 13px "DM Sans",sans-serif;transition:color .15s}'
    + '.sb-foot a:hover{color:#ef4444}'
    + '.has-sidebar{margin-left:220px}'
    + '.has-sidebar .bar{left:220px}'
    + '@media(max-width:768px){'
    + '  .app-sidebar{transform:translateX(-100%)}'
    + '  .app-sidebar.sb-visible{transform:translateX(0)}'
    + '  .sb-toggle{display:block}'
    + '  .has-sidebar{margin-left:0}'
    + '  .has-sidebar .bar{left:0}'
    + '  .sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:8999}'
    + '  .sb-overlay.sb-show{display:block}'
    + '}';

  var style = document.createElement('style');
  style.textContent = sidebarCSS;
  document.head.appendChild(style);

  var wrapper = document.createElement('div');
  wrapper.innerHTML = sidebarHTML;
  document.body.insertBefore(wrapper.firstChild, document.body.firstChild);

  var overlay = document.createElement('div');
  overlay.className = 'sb-overlay';
  overlay.id = 'sbOverlay';
  document.body.appendChild(overlay);

  document.body.classList.add('has-sidebar');

  // Toggle submenu
  var parents = document.querySelectorAll('.sb-parent');
  for (var i = 0; i < parents.length; i++) {
    parents[i].addEventListener('click', function(e){
      e.preventDefault();
      this.parentElement.classList.toggle('sb-open');
    });
  }

  // Mobile toggle
  var toggle = document.getElementById('sbToggle');
  var sidebar = document.getElementById('appSidebar');
  if (toggle) {
    toggle.addEventListener('click', function(){
      sidebar.classList.toggle('sb-visible');
      overlay.classList.toggle('sb-show');
    });
    overlay.addEventListener('click', function(){
      sidebar.classList.remove('sb-visible');
      overlay.classList.remove('sb-show');
    });
  }
})();
