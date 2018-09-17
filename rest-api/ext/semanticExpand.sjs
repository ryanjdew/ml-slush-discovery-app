'use strict';

const sem = require("/MarkLogic/semantics.xqy");

function slidingWindow(words, windowSize) {
  return words.map((word, index) => {
      let window = slidingWindowImpl(words, index, windowSize);
      return (window)? window.join(' '): undefined;
  }).filter((word) => {
    return word;
  });
}

function slidingWindowImpl(data, cur, len) {
    var win = [],
        num = data.length,
        numVisible = len;
    if ((cur + numVisible) <= num) {
      // A negative cur is the same as num - abs(cur)
      if (cur < 0) {
          cur = num + cur;
      }
      // Now keep adding items until we have enough
      while (win.length < numVisible) {
          var first = (win.length?0:Math.abs(cur)%num),
              missing = numVisible - win.length,
              last = Math.min(first + missing, num);
          win = win.concat(data.slice(first, last));
      }
      return win;
    }
}

// GET
//
// This function returns a document node corresponding to each
// user-defined parameter in order to demonstrate the following
// aspects of implementing REST extensions:
// - Returning multiple documents
// - Overriding the default response code
// - Setting additional response headers
//
function get(context, params) {
  const queryOptions = ['case-insensitive', 'stemmed'];
  const query = fn.normalizeSpace(params.qtext);
  const words = cts.tokenize(query).toArray()
        .filter((token) => { return fn.deepEqual(sc.name(sc.type(token)), fn.QName("http://marklogic.com/cts", "word")) })
        .map((token) => fn.string(token));

  const twoGrams = slidingWindow(words, 2);
  const threeGrams = slidingWindow(words, 3);
  const fourGrams = slidingWindow(words, 4);
  const fiveGrams = slidingWindow(words, 5);
  const ontologyMatches = words.concat(twoGrams).concat(threeGrams).concat(fourGrams).concat(fiveGrams).map((term) => {
      var sparqlMatch = fn.head(sem.sparql(`
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX xs: <http://www.w3.org/2001/XMLSchema#>

        SELECT ?iri (GROUP_CONCAT(DISTINCT xs:string(?relatedLabel);separator='|;|') as ?relatedLabels) (GROUP_CONCAT(DISTINCT xs:string(?synonym);separator='|;|') as ?synonyms)
        WHERE {
          ?iri (rdfs:label|skos:prefLabel|skos:altLabel) $label. #Bound variable to match on

          {
            ?iri (rdfs:label|skos:prefLabel|skos:altLabel) ?synonym. #Unbound variable that will pick up synonyms
          } UNION {
            ?descendantIri (rdfs:subClassOf+|skos:broader+) ?iri.
            ?descendantIri (rdfs:label|skos:prefLabel|skos:altLabel) ?synonym.
          }
          OPTIONAL {
            ?iri skos:related ?relatedIri.
            ?relatedIri (rdfs:label|skos:prefLabel|skos:altLabel) ?relatedLabel.
          }
        }
        GROUP BY ?iri
        LIMIT 1
      `, {'label': [term, rdf.langString(term, 'en')]}, [],
          cts.orQuery([
            cts.jsonPropertyValueQuery(['object','value'], term, 'case-insensitive'),
            cts.elementValueQuery([fn.QName('http://marklogic.com/semantics','object')], term, 'case-insensitive')
          ])
      ));
      if (sparqlMatch) {
        sparqlMatch.label = term;
        sparqlMatch.relatedLabels = fn.tokenize(sparqlMatch.relatedLabels, '\\|;\\|').toArray();
        sparqlMatch.synonyms = fn.tokenize(sparqlMatch.synonyms, '\\|;\\|').toArray();
      }
      return sparqlMatch;
  }).filter((val, index, array) => {
    return val && !array.find((otherVal) => { return otherVal && fn.contains(otherVal.label, val.label) && otherVal.label !== val.label;  });
  });
  const ontologyTerms = ontologyMatches.map((match) => {
    return match.label;
  });
  const allWordsOntology = words.filter((val) => {
    return val && !ontologyTerms.find((otherVal) => { return otherVal && fn.contains(otherVal, val) && otherVal !== val; });
  }).concat(ontologyTerms);
  const synonymsByWord = {};
  const relatedTermsByWord = {};
  let relatedTerms = [];
  let synonyms = [];
  const ontologyAllSynonyms = ontologyMatches.map((match) => {
    synonymsByWord[match.label] = match.synonyms;
    relatedTermsByWord[match.label] = match.relatedLabels;
    relatedTerms = relatedTerms.concat(match.relatedLabels);
    synonyms = synonyms.concat(match.synonyms.filter((syn) => { return syn !== match.label; }));
    return match.synonyms;
  });
  const allWordsWithSynonyms = fn.distinctValues(Sequence.from(ontologyAllSynonyms.reduce((accumulator, currentValue) => {
    if (Array.isArray(currentValue)) {
      return accumulator.concat(currentValue);
    } else {
      accumulator.push(currentValue);
      return accumulator;
    }
  }, words))).toArray();
  const enhancedQuery = cts.andQuery(allWordsOntology.map((word) => {
      let wordQueries = [
        cts.wordQuery(word, queryOptions, 4)
      ]
      if (synonymsByWord[word]) {
        wordQueries.push(
          cts.wordQuery(synonymsByWord[word], queryOptions.concat('synonym'), 0)
        );
      }
      return cts.orQuery(wordQueries);
    }));

  return {
    enhancedQuery: enhancedQuery,
    relatedTerms: relatedTerms,
    synonyms: synonyms
  };
}

exports.GET = get;
