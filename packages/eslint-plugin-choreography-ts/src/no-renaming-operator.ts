// no-renaming-operator.js: must NOT rename choreographic operators
// https://github.com/shumbo/choreography-ts/issues/19

// Create custom typescript rules: https://typescript-eslint.io/developers/custom-rules/
// Better: https://medium.com/inato/using-typescript-to-build-custom-eslint-rules-faster-53ad1c9dee2b
"use strict";
import {
  AST_NODE_TYPES,
  TSESTree,
  TSESLint,
  ESLintUtils,
} from "@typescript-eslint/utils";

type MessageIDs = "rename" | "invalid";

const operators = /^(colocally|call)$/; // The operators that accept a choreography as an argument
const choreographySelector = `VariableDeclaration[kind = "const"] > VariableDeclarator`;
const operatorSelector = `${choreographySelector} CallExpression[callee.name = ${operators}]`;
// Match any top-level choreography, or any choreographic operator call that accepts a choreography argument
const functionSelector = `:matches(${choreographySelector} > ArrowFunctionExpression, ${choreographySelector} > FunctionExpression, ${operatorSelector} > ArrowFunctionExpression, ${operatorSelector} > FunctionExpression)`;

const noRenameRule: TSESLint.RuleModule<MessageIDs, []> = {
  defaultOptions: [],
  meta: {
    type: "problem",
    docs: {
      description:
        "First parameter of Choreographic function type must be of object type",
      recommended: "recommended",
      url: "https://github.com/shumbo/choreography-ts/issues/19",
    },
    fixable: undefined, // Not an automatically fixable problem
    messages: {
      rename: "Choreographic operators cannot be renamed.",
      invalid: "Choreographic operators must be destructured.",
    },
    schema: [],
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context); // Use parser to extract type information for the nodes
    return {
      [functionSelector]: function (
        node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
      ) {
        const variableDeclaratorAncestor: TSESTree.Node = context
          .getAncestors()
          .find(
            (val) => val.type === AST_NODE_TYPES.VariableDeclarator,
          ) as TSESTree.VariableDeclarator;
        if (
          services
            .getTypeAtLocation(variableDeclaratorAncestor.id)
            .aliasSymbol?.getEscapedName() === "Choreography"
        ) {
          if (node.params[0]?.type === AST_NODE_TYPES.ObjectPattern) {
            // If the first argument for the choreography is an object pattern
            node.params[0].properties.forEach((property) => {
              // Check for shorthand json format: {locally, colocally, ...}, and no rest element `...rest`
              if (
                property.type === AST_NODE_TYPES.Property
                  ? property.shorthand !== true
                  : true // should always be true if type is "RestElement"
              ) {
                context.report({
                  node: property,
                  messageId: "rename",
                });
              }
            });
          } else if (node.params[0]) {
            // Otherwise if the first parameter isn't undefined
            context.report({
              node: node.params[0],
              messageId: "invalid",
            });
          }
        }
      },
    };
  },
};

export default noRenameRule;
