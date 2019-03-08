/***********************************************************
// OSTEP Dashboard Github API
// service.cpp
// Date: 2018/09/22
// Author: Yiran Zhu And Lewis Kim
// Email: yzhu132@myseneca.ca
// Description: Github API that gets all the sorted recent 
// commits from an organization/user
***********************************************************/


var request = require("request");
var key = process.env.GITHUB_TOKEN;
var repoUrl = 'https://api.github.com/orgs/Seneca-CDOT/repos?per_page=100&access_token=' + key;
console.log(key);
let repoUrls = [];         // Attributes: 'name', 'url'
let branchURLs = [];       // Attributes: 'branchName', 'branchCommitsUrl', 'repoName'
let recentCommits = [];    // Attributes: 'branchName', 'repoName', 'commit'
let fs = require('fs');

let today = new Date();
const oneDay = 24 * 60 * 60 * 1000;
let recency = oneDay;

var eq, deepEq;
eq = function(a, b, aStack, bStack) {
    if (a === b) return a !== 0 || 1 / a === 1 / b;    
    if (a == null || b == null) return false;    
    if (a !== a) return b !== b;
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
};
    
deepEq = function(a, b, aStack, bStack) {
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;

    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
        case '[object RegExp]':
        case '[object String]':
            return '' + a === '' + b;
        case '[object Number]':
            if (+a !== +a) return +b !== +b;
            return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case '[object Date]':
        case '[object Boolean]':
            return +a === +b;
        case '[object Symbol]':
            return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
    }
    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
        if (aStack[length] === a) return bStack[length] === b;
    }
    aStack.push(a);
    bStack.push(b);
    if (areArrays) {
        length = a.length;
        if (length !== b.length) return false;
        while (length--) {
            if (!eq(a[length], b[length], aStack, bStack)) return false;
        }
    } else {
        var keys = _.keys(a), key;
        length = keys.length;
        if (_.keys(b).length !== length) return false;
        while (length--) {
            key = keys[length];
            if (!(has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
        }
    }
    aStack.pop();
    bStack.pop();
    return true;
};

function arrUnique(arr) {
    var cleaned = [];
    arr.forEach(function(itm) {
        var unique = true;
        cleaned.forEach(function(itm2) {
            if (eq(itm, itm2)) unique = false;
        });
        if (unique)  cleaned.push(itm);
    });
    return cleaned;
}

module.exports.initialize = () => {
    return new Promise((resolve, reject) => {
        fs.appendFileSync('output.txt', "INITIALIZE \n");
        today = new Date();
        repoUrls = [];
        branchURLs = [];
        recentCommits = [];
        resolve();
    });
}

//1. getRepos
module.exports.getRepos = () => {
    return new Promise ((resolve, reject) => {
        request.get({
            url: repoUrl,
            headers: {'User-Agent': 'request'},
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject("Unable to get repos.");
              } else {
                let reposX = JSON.parse(data);
                for (let i = 0; i < reposX.length; i++){
                    if (new Date(today - new Date(reposX[i].pushed_at)) < new Date(recency)) {
                        repoUrls.push({
                            'name': reposX[i].name,
                            'url': reposX[i].url + "/branches?access_token=" + key
                        });
                        fs.appendFileSync('output.txt', "repo name [" + i + "]: " + reposX[i].name + 'IS ADDED' + '\n');
                    } else {
                        fs.appendFileSync('output.txt', "repo name [" + i + "]: " + reposX[i].name + 'IS REJECTED!!' + '\n');
                    }
                }
                fs.appendFileSync('outputArrays.txt', "REPO URLs:\n");
                for (let i = 0; i < repoUrls.length; i++) {
                    fs.appendFileSync('outputArrays.txt', repoUrls[i].name + ": " + repoUrls[i].url + "\n");
                } 
                resolve();
              }
        });
    });
}

//2. getAllBranchUrls
module.exports.getAllBranchUrls = () => {
    return new Promise((resolve,reject) => {
        for (let i = 0; i < repoUrls.length; i++) {
            getBranches(repoUrls[i].url, repoUrls[i].name);
        }
        resolve();
    });
}

let getBranches = (branchUrlX, repoName) => {
    return new Promise ((resolve, reject) => {
        request.get({
            url: branchUrlX,
            headers: {'User-Agent': 'request'},
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject("Unable to access branches.");
              } else {
                let branch = JSON.parse(data);
                fs.appendFileSync('output.txt', "DEBUG getBranches branchUrlX: " + branchUrlX + '\n');
                fs.appendFileSync('output.txt', "DEBUG getBranches. branch.length: " + branch.length + '\n');
                fs.appendFileSync('output.txt', "DEBUG getBranches repoName: " + repoName + '\n');               
                for (let j = 0; j < branch.length; j ++){
                    fs.appendFileSync('output.txt', "DEBUG getBranches branch[" + j + "] name: " + JSON.stringify(branch[j].name) + '\n');
                    fs.appendFileSync('output.txt', "DEBUG getBranches branch[" + j + "] commit url: " + JSON.stringify(branch[j].commit.url) + '\n');
                    checkBranch(branch[j].commit.url, branch[j].name, branchURLs, repoName);
                }
                fs.appendFileSync('output.txt', '\n');
                resolve();
              }
        });
    });
} 


let checkBranch = (branchCommitsUrl, branchName, branchURLs, repoName) => {
    return new Promise ((resolve, reject) => {
        request.get({
            url: branchCommitsUrl + "?access_token=" + key,
            headers: {'User-Agent': 'request'},
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject("Unable to access branches.");
              } else {
                let branchCommit = JSON.parse(data);
                fs.appendFileSync('output.txt', "DEBUG checkBranch: " + repoName + ":" + branchName + " => " + JSON.stringify(branchCommit.commit.committer.name) + ", time: " + branchCommit.commit.committer.date);
                if (new Date(today - new Date(branchCommit.commit.committer.date)) < new Date(recency)) {
                    //fs.appendFileSync('output.txt', " IS ADDED ----" + '\n');
                    fs.appendFileSync('output.txt', '\n');
                    branchURLs.push({
                        'branchName': branchName,
                        'branchCommitsUrl': branchCommitsUrl + "?access_token=" + key,
                        'repoName' : repoName
                    });
                    //console.log(" ADDED BRANCH: " + JSON.stringify(branchCommit.commit.committer.name) + "'s " + branchName + '\n');
                    fs.appendFileSync('outputArrays.txt', branchURLs.length + " ADDED BRANCH: " + branchName + '\n');
                    resolve();
                } else {
                    fs.appendFileSync('output.txt', " IS REJECTED!!!" + '\n');
                    //reject();
                }
            }
        });
    });
} 

//3. getCommits
module.exports.getAllCommitUrls = () => {
    return new Promise((resolve,reject) => {
        fs.appendFileSync('outputArrays.txt', "getAllCommitUrls BRANCH URLs: " + branchURLs.length + "\n");
        for (let i = 0; i < branchURLs.length; i++) {
            fs.appendFileSync('outputArrays.txt', branchURLs[i].branchName + ": " + branchURLs[i].branchCommitsUrl + "\n");
        }
        for (let i = 0; i < branchURLs.length; i++) {
            getTheRecentCommits(branchURLs[i].branchCommitsUrl, branchURLs[i].branchName, branchURLs[i].repoName);
        }

        resolve(recentCommits);
    });
}

let getTheRecentCommits = (branchCommitsUrl, branchName, repoName) => {
    let newUrl = [branchCommitsUrl.slice(0, branchCommitsUrl.lastIndexOf("/")), "?per_page=100&sha=", branchCommitsUrl.slice(branchCommitsUrl.lastIndexOf("/") + 1)].join('');
    newUrl = newUrl.replace("?access", "&access");
    //fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits newUrl: " + newUrl + '\n');
    return new Promise ((resolve, reject) => {
        request.get({
            url: newUrl,
            headers: {'User-Agent': 'request'},
        }, (err, res, data) => {
            if (err) {
                console.log('Error:', err);
                reject("Unable to access branches.");
            } else {
                let branchCommits = JSON.parse(data);
                fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits branchCommitsUrl: " + newUrl + '\n');
                fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits. branchCommits.length: " + branchCommits.length + '\n');
                fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits branchName: " + branchName + '\n');
                for (let j = 0; j < branchCommits.length; j ++){
                    if (new Date(today - new Date(branchCommits[j].commit.committer.date)) < new Date(recency)){
                        fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits added branchCommits[" + j + "] name: " + JSON.stringify(branchCommits[j].commit.committer.name) + '\n');
                        fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits added branchCommits[" + j + "] message: " + JSON.stringify(branchCommits[j].commit.message) + '\n');
                        fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits added branchCommits[" + j + "] date: " + JSON.stringify(branchCommits[j].commit.committer.date) + '\n');
                        fs.appendFileSync('output.txt', "DEBUG getTheRecentCommits added branchCommits[" + j + "] repo-branch: " + repoName + "-" + branchName + '\n');
                        branchCommits[j].commit.repoName = repoName;
                        branchCommits[j].commit.branchName = branchName;
                        recentCommits.push(branchCommits[j].commit);
                        /*recentCommits.push ({
                            'repoName': repoName,
                            'branchName': branchName,
                            'commit': branchCommits[j].commit
                        });*/

                    } else {
                        j = branchCommits.length;
                    }
                }
                fs.appendFileSync('output.txt', '\n');
                resolve();
              }
        });
    });
} 

// 4. sortRecentCommits
module.exports.sortRecentCommits = () => {
    return new Promise((resolve, reject) => {
        recentCommits.sort((a,b) => {
            let c = new Date(a.committer.date);
            let d = new Date(b.committer.date);
            return d - c;
        });
        fs.appendFileSync('outputArrays.txt', "sortRecentCommits sorted recent commits: " + recentCommits.length + "\n");
        for (let i = 0; i < recentCommits.length; i++) {
            fs.appendFileSync('outputArrays.txt', recentCommits[i].repoName + ":" + recentCommits[i].branchName + " - " + recentCommits[i].message + "\n");
        }
        recentCommits = arrUnique(recentCommits);
        resolve(recentCommits);
    });
}


module.exports.delay = (t, v) => {
    return new Promise((resolve) => {
        setTimeout(resolve.bind(null, v), t);
    });
}