require(['{{MODULE_MAIN}}','reactDOM','react'], function(root_app, ReactDom, React) {
    var r =  React.createElement(root_app);
    ReactDom.render(r, document.getElementById('app'));
    console.log('App initialized.');
});