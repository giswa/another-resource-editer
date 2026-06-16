const rootURL = process.env.REACT_APP_API_URL ;

var user ; 
var branches ; 
var objectID ;
// var default_branch ;

export async function GetUser(){

    // load repositories info and get user info from response header
    const res = await fetch(`${rootURL}`)
    let data = '';
    if (res.ok) {
        setUser(res.headers.get('X-VSS-UserData') ) ; 
        data = await res.text();
        const j =  JSON.parse(data) ;
        // get info from first repository returned
        objectID = j.value[0].id ;
        // default_branch = j.value[0].defaultBranch ;
        // console.log(j) ;    
        // return j ;
    }
    else {
        throw new Error('Bad reponse')
    }

    // console.log(user);
    return user ; 
}

export async function GetRepositories(){
    // load repositories infos
    const res = await fetch(`${rootURL}`)
    let data = '';
    if (res.ok) {
        data = await res.text();
        const j =  JSON.parse(data) ;
        return j.value ;
    }
    else {
        throw new Error('Bad reponse')
    }
}

export async function GetBranches(){
    // load branches info
    const res = await fetch(`${rootURL}refs/${objectID}/`)
    let data = '';
    if (res.ok) {
        data = await res.text();
        const j =  JSON.parse(data) ;
        return j.value  ;
    }
    else {
        throw new Error('Bad reponse')
    }
}

export async function GetFileList(){

    const files = [] ;
    const res = await fetch(`${rootURL}trees/${objectID}/`)

    if (res.ok) {
        const data = await res.text();
        const j =  JSON.parse(data) ;      
        // filter files (blob) of extension ".resx"
        for ( const treeEntry of j.treeEntries )
            if (treeEntry.gitObjectType == "blob" && treeEntry.relativePath.indexOf(".resx") > 0 )
                files.push( treeEntry.relativePath );
        return files ;
    }
    else {
        throw new Error('Bad reponse')
    }

}

function setUser ( userData){

    if (userData){
        let arr = userData.split(":") ;
        user = { login: arr[1], id: arr[0]} ;
    }

}