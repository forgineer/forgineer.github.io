// Init
window.onload = function setLinks() {
    var linkText = hostname;
    //var linkText  = hostname + "|<a href='/bootstrap'>Bootstrap Budget!</a>"
    //              + "|<a href='/codiad'>Codiad</a>"
    //              + "|<a href='" + aNodeRed + "'>Node-Red</a>|";
    
    // Paint links
    document.getElementById("author").innerHTML = linkText;
}