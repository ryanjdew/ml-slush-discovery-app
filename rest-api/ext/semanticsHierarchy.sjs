'use strict';

const sem = require("/MarkLogic/semantics.xqy");

const topLevelQueryByType = {
  'SKOS': `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        SELECT DISTINCT ?iri (MAX(?label) as ?label) WHERE {
          ?iri rdf:type skos:ConceptScheme;
               (skos:prefLabel|rdfs:label) ?label.
          FILTER (lang(?label) = "en")
        }
        GROUP BY ?iri
        ORDER BY ?label
        `,
  'RDF': `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?iri ?label WHERE {
          ?iri rdf:type rdfs:Class;
               rdfs:label ?label.
          FILTER (lang(?label) = "en")
        }
        ORDER BY ?label
        `
};
const queryByType = {
  'SKOS': `
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

        SELECT DISTINCT ?iri ?label WHERE {
          {
            ?iri skos:broader $parentIRI;
                  skos:prefLabel ?label.
          } UNION {
            ?iri skos:topConceptOf $parentIRI;
                  skos:prefLabel ?label.
          } UNION {
            $parentIRI skos:hasTopConcept ?iri.
            ?iri skos:prefLabel ?label.
          }
          FILTER (lang(?label) = "en")
        }
        ORDER BY ?label
        `,
  'RDF': `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?iri ?label WHERE {
          ?iri rdfs:subClassOf $parentIRI.
          ?iri rdfs:label ?label.
          FILTER (lang(?label) = "en")
        }
        ORDER BY ?label
        `
};

const allChildIRIs = {
  'SKOS': `
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

        SELECT DISTINCT ?iri WHERE {
          ?iri skos:broader* $parentIRI.
        }
        `,
  'RDF': `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?iri WHERE {
          ?iri rdfs:subClassOf* $parentIRI.
        }
        `
};
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
  return post(null, context, params);
}

function post(context, params, input) {
  const parentIRI = params.parentIRI ? sem.iri(params.parentIRI) : null;
  const type = params.hierarchyType || 'SKOS';
  const childTriples = (parentIRI) ? sem.sparql(queryByType[type], {'parentIRI': parentIRI }).toArray() :
      sem.sparql(topLevelQueryByType[type]).toArray();
  for (let childTriple of childTriples) {
    childTriple.allSubIRIs = sem.sparql(queryByType[type], {'parentIRI': childTriple.iri }).toArray().map((info) => info.iri);
    childTriple.subIRICount = childTriple.allSubIRIs.length;
    childTriple.allIRIs = childTriple.allSubIRIs.concat([childTriple.iri]);
    childTriple.count = cts.estimate(
      cts.andQuery([
        cts.orQuery([
          cts.tripleRangeQuery(childTriple.allIRIs, [], []),
          cts.tripleRangeQuery([], [], childTriple.allIRIs)
        ])
      ])
    );
    childTriple.hasChildren = childTriple.allSubIRIs.length > 0;
    delete childTriple.allSubIRIs;
    delete childTriple.allIRIs;
  }
  return {
    total: childTriples.length,
    childTriples: childTriples
  };
}
exports.GET = get;
exports.POST = post;
