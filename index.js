var Segment = require('segment')
  , segment = new Segment()
  , textract = require('textract')
  , glob = require('glob')
  , fs = require('fs')
  , forwardIndex = {}
  , invertedIndex = {};

segment.useDefault();

var allPathPromise = new Promise(function(resolve, reject) {
  glob('files/**/*.+(txt|doc|docx|pdf|rtf|xls|xlsx|html|xml)', function(err, files) {
    if (err) {
      resolve([]);
    }
    else {
      resolve(files);
    }
  });
});

allPathPromise.then(function(allPath) {
  Promise.all(
    allPath.map(function(path) {
      return new Promise(function(resolve, reject) {
        textract.fromFileWithPath(path, function(err, text) {
          if (err) {
            resolve({});
          }
          else {
            resolve({
              path: path,
              index: segment.doSegment(text, { simple: true, stripPunctuation: true})
            });
          }
        });
      });
    })
  ).then(function(allIndex) {
    allIndex.map(function(value) {
      var indexCollection = value.index.reduce(function(prev, now, i) {
        var hasFind = !prev.every(function(v) {
          return !(v.word === now);
        });
        if (hasFind) {
          return prev.map(function(v) {
            if (v.word === now) {
              var newIndex = v.index;
              newIndex.push(i);
              return { word: v.word, index: newIndex };
            }
            else {
              return v;
            }
          });
        }
        else {
          prev.push({word: now, index: [i]});
          return prev;
        }
      }, []);

      // 建立正向索引
      forwardIndex[value.path] = indexCollection;

      // 建立反向索引
      indexCollection.map(function(word) {
        if (!(word in invertedIndex)) {
          invertedIndex[word.word]=[];
        }
        invertedIndex[word.word].push({ path: value.path, index: word.index });
      })
    });

    var finalIndex = JSON.stringify({ forwardIndex: forwardIndex, invertedIndex: invertedIndex });

    fs.writeFile("finalIndex.json",finalIndex,function (err) {
      if (err) throw err ;
      console.log("Saved"); //文件被保存
    });
  });
});
