xquery version "1.0-ml";

module namespace expand="http://marklogic.com/content-helpes/content-expansion";

import module namespace sem = "http://marklogic.com/semantics"
      at "/MarkLogic/semantics.xqy";

declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace ingest = "http://marklogic.com/dll/ingest-binaries";
declare namespace zip = "xdmp:zip";

declare variable $stop-words := map:new((
  for $w in ("slide","www","a","a's","able","about","above","according","accordingly","across","actually","after","afterwards","again","against","ain't","all","allow","allows","almost","alone","along","already","also","although","always","am","among","amongst","an","and","another","any","anybody","anyhow","anyone","anything","anyway","anyways","anywhere","apart","appear","appreciate","appropriate","are","aren't","around","as","aside","ask","asking","associated","at","available","away","awfully","b","be","became","because","become","becomes","becoming","been","before","beforehand","behind","being","believe","below","beside","besides","best","better","between","beyond","both","brief","but","by","c","c'mon","c's","came","can","can't","cannot","cant","cause","causes","certain","certainly","changes","clearly","co","com","come","comes","concerning","consequently","consider","considering","contain","containing","contains","corresponding","could","couldn't","course","currently","d","definitely","described","despite","did","didn't","different","do","does","doesn't","doing","don't","done","down","downwards","during","e","each","edu","eg","eight","either","else","elsewhere","enough","entirely","especially","et","etc","even","ever","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","far","few","fifth","first","five","followed","following","follows","for","former","formerly","forth","four","from","further","furthermore","g","get","gets","getting","given","gives","go","goes","going","gone","got","gotten","greetings","h","had","hadn't","happens","hardly","has","hasn't","have","haven't","having","he","he's","hello","help","hence","her","here","here's","hereafter","hereby","herein","hereupon","hers","herself","hi","him","himself","his","hither","hopefully","how","howbeit","however","i","i'd","i'll","i'm","i've","ie","if","ignored","immediate","in","inasmuch","inc","indeed","indicate","indicated","indicates","inner","insofar","instead","into","inward","is","isn't","it","it'd","it'll","it's","its","itself","j","just","k","keep","keeps","kept","know","knows","known","l","last","lately","later","latter","latterly","least","less","lest","let","let's","like","liked","likely","little","look","looking","looks","ltd","m","mainly","many","may","maybe","me","mean","meanwhile","merely","might","more","moreover","most","mostly","much","must","my","myself","n","name","namely","nd","near","nearly","necessary","need","needs","neither","never","nevertheless","new","next","nine","no","nobody","non","none","noone","nor","normally","not","nothing","novel","now","nowhere","o","obviously","of","off","often","oh","ok","okay","old","on","once","one","ones","only","onto","or","other","others","otherwise","ought","our","ours","ourselves","out","outside","over","overall","own","p","particular","particularly","per","perhaps","placed","please","plus","possible","presumably","probably","provides","q","que","quite","qv","r","rather","rd","re","really","reasonably","regarding","regardless","regards","relatively","respectively","right","s","said","same","saw","say","saying","says","second","secondly","see","seeing","seem","seemed","seeming","seems","seen","self","selves","sensible","sent","serious","seriously","seven","several","shall","she","should","shouldn't","since","six","so","some","somebody","somehow","someone","something","sometime","sometimes","somewhat","somewhere","soon","sorry","specified","specify","specifying","still","sub","such","sup","sure","t","t's","take","taken","tell","tends","th","than","thank","thanks","thanx","that","that's","thats","the","their","theirs","them","themselves","then","thence","there","there's","thereafter","thereby","therefore","therein","theres","thereupon","these","they","they'd","they'll","they're","they've","think","third","this","thorough","thoroughly","those","though","three","through","throughout","thru","thus","to","together","too","took","toward","towards","tried","tries","truly","try","trying","twice","two","u","un","under","unfortunately","unless","unlikely","until","unto","up","upon","us","use","used","useful","uses","using","usually","uucp","v","value","various","very","via","viz","vs","w","want","wants","was","wasn't","way","we","we'd","we'll","we're","we've","welcome","well","went","were","weren't","what","what's","whatever","when","whence","whenever","where","where's","whereafter","whereas","whereby","wherein","whereupon","wherever","whether","which","while","whither","who","who's","whoever","whole","whom","whose","why","will","willing","wish","with","within","without","won't","wonder","would","would","wouldn't","x","y","yes","yet","you","you'd","you'll","you're","you've","your","yours","yourself","yourselves","z","zero")

  return map:entry($w, 1)
));

declare variable $triple-types as map:map := map:new((
    map:entry("text/turtle", "turtle"),
    map:entry("text/n-triples", "ntriple"),
    map:entry("application/rdf+xml", "rdfxml"),
    map:entry("text/n3", "n3"),
    map:entry("application/trig", "trig")
  ));

declare option xdmp:mapping "false";

declare function expand:document(
  $uri as xs:string,
  $content as document-node(),
  $shouldDecode as xs:boolean,
  $collections as xs:string*
) as document-node()
{
  let $content-type := xdmp:uri-content-type($uri)
  let $_log := xdmp:log("loading "|| $uri ||" of content type " || $content-type)
  let $content :=
    if ($shouldDecode) then
      let $binary :=
        if ($content castable as xs:base64Binary) then
          document { binary { xs:hexBinary(xs:base64Binary($content)) } }
        else if ($content castable as xs:hexBinary) then
          document { binary { xs:hexBinary($content) } }
        else (
          $content
        )
      let $utf-8-binary :=
        if (fn:exists($binary/binary())) then
          xdmp:binary-decode($binary, "UTF-8")
        else
          $content

      return
        if ($utf-8-binary castable as xs:hexBinary) then
          document {
            binary {
              xs:hexBinary($utf-8-binary)
            }
          }
        else if ($utf-8-binary castable as xs:base64Binary) then
          document {
            binary {
              xs:hexBinary(xs:base64Binary($utf-8-binary))
            }
          }
        else
          document {
            $utf-8-binary
          }
    else
      $content
  return
    if ($content-type = map:keys($triple-types)) then (
      expand:triples(
        $uri,
        $content,
        $content-type,
        $collections
      ),
      $content
    ) else if ($content-type eq "text/csv") then (
      expand:csv(
        $uri,
        $content,
        $collections
      ),
      document {
        "ExpandedToJson"
      }
    ) else if ($content-type eq "application/zip") then (
      expand:zip($uri, $content, $collections),
      $content
    ) else if (fn:matches($content-type, "^(text/.*|application/(.+\+)?(xml|json))$")) then (
      $content
    ) else (
      expand:binary($uri, $content, $content-type, $collections),
      $content
    )
};

declare function expand:decode-hex($hexBinary as document-node())
{
  let $hex := fn:string($hexBinary/binary())
  return
    document {
      fn:codepoints-to-string(
        for $i in (1 to fn:string-length($hex))
        where ($i mod 2) eq 1
        return
          xdmp:hex-to-integer(fn:substring($hex, $i, 2))
      )
    }
};

declare
function expand:matches-entire-text(
  $q as cts:query,
  $matching-text as xs:string)
 as xs:boolean {
  $matching-text = cts:walk(element t {$matching-text},$q,$cts:text)
};

declare function expand:enrich-text($elem) {
  let $terms := (
    cts:distinctive-terms(
        text { lower-case(fn:string($elem)) },
        <options xmlns="cts:distinctive-terms">
          <max-terms>30</max-terms>
        </options>
      )/cts:term[every $text in .//cts:text satisfies not(matches($text, '^\d+$') or map:contains($stop-words, fn:lower-case($text)))]
  )
  let $query := cts:or-query($terms/*/cts:query(.))
  return
    cts:highlight($elem, $query,
      if (fn:count($cts:queries) eq 1 or (every $q in $cts:queries satisfies expand:matches-entire-text($q,$cts:text))) then
        element tag { $cts:text }
     else
        xdmp:set($cts:action, "continue")
   )
};

declare function expand:binary(
  $uri as xs:string,
  $content as document-node(),
  $content-type as xs:string,
  $collections as xs:string*
) as empty-sequence()
{
  let $metadata :=
    if (fn:contains($content-type, "application/pdf")) then
      try {
        fn:tail(xdmp:pdf-convert($content, fn:tokenize($uri, "/")[fn:last()]))/element()
      } catch ($e) {
        xdmp:document-filter($content)
      }
    else
      xdmp:document-filter($content)
  let $new-metadata := expand:enrich-text($metadata)
  return (
    xdmp:document-insert($uri || ".xml",
      element binary-details {
        element binary-file-location {$uri},
        element binary-content-type {$content-type},
        element metadata {
          $new-metadata
        }
      },
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
  )
};


(:
declare function expand:binary(
  $uri as xs:string,
  $content as document-node(),
  $content-type as xs:string,
  $collections as xs:string*
) as empty-sequence()
{
  let $metadata :=
    if (fn:contains($content-type, "application/pdf")) then
      try {
        fn:tail(xdmp:pdf-convert($content, fn:tokenize($uri, "/")[fn:last()]))/element()
      } catch ($e) {
        xdmp:document-filter($content)
      }
    else
      xdmp:document-filter($content)
  return (
    xdmp:document-insert($uri || ".xml",
      element binary-details {
        element binary-file-location {$uri},
        element binary-content-type {$content-type},
        element metadata {
          $metadata
        },
        element distinct-terms {cts:distinctive-terms($metadata/node(), <options xmlns="cts:distinctive-terms"><max-terms>20</max-terms></options>)}
      },
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
  )
};
:)

declare function expand:csv(
  $uri as xs:string,
  $content as document-node(),
  $collections as xs:string*
) as empty-sequence()
{
  let $uri-base := fn:replace($uri, "\.[^\.]+$", "/")
  let $lines := fn:tokenize($content, "(&#10;|&#13;)+")
  let $headers := fn:tokenize(fn:head($lines), ",")
  for $row at $row-num in fn:tail($lines)
  let $properties :=
    if (fn:matches($row, '"([^"]+)"')) then
      for $part in fn:analyze-string($row ,'"([^"]+)"')/*
      return
        typeswitch($part)
        case element(fn:match) return
          fn:string($part/fn:group)
        default return
          fn:tokenize($part, "\s*,\s*") ! fn:normalize-space()[. ne '']
    else
      fn:tokenize($row, "\s*,\s*")
  return
    xdmp:document-insert($uri-base || $row-num || ".json",
      xdmp:to-json(
        map:new((
          for $prop-label at $prop-pos in $headers
          return
            map:entry($prop-label, $properties[$prop-pos])
        ))
      ),
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
};

declare function expand:zip(
  $uri as xs:string,
  $content as document-node(),
  $collections as xs:string*
) as empty-sequence()
{
  let $uri-base := fn:replace($uri, "\.[^\.]+$", "/")
  let $manifest := xdmp:zip-manifest($content/binary())
  for $part in $manifest/zip:part
  let $file-relative-uri := fn:string($part)
  let $file-full-uri := $uri-base || $file-relative-uri
  let $file-content :=
    xdmp:zip-get(
      $content,
      $file-relative-uri
    )
  let $file-content :=
    typeswitch($file-content)
    case document-node() return
      $file-content
    default return
      document { $file-content }
  return
    xdmp:document-insert($file-full-uri,
      expand:document(
        $file-full-uri,
        $file-content,
        fn:false(),
        $collections
      ),
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      ),
      $collections
    )
};

declare function expand:triples(
  $uri as xs:string,
  $content as document-node(),
  $content-type as xs:string,
  $collections as xs:string*
)
{
  let $new-uri := fn:replace($uri, "\.[^\.]+$", ".xml")
  return
    xdmp:document-insert($new-uri,
      element sem:triples {
        sem:rdf-parse($content, (map:get($triple-types, $content-type), "repair"))
      },
      (
        xdmp:permission("rest-reader", "read"),
        xdmp:permission("rest-writer", "update")
      )
    )
};

