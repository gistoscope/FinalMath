import React, { useState } from "react";

interface AstNode {
  type: string;
  value?: any;
  op?: string;
  name?: string;
  left?: AstNode;
  right?: AstNode;
  numerator?: any;
  denominator?: any;
  whole?: any;
  args?: AstNode[];
  arg?: AstNode;
}

interface Props {
  node: AstNode;
}

const AstTreeView: React.FC<Props> = ({ node }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = (n: AstNode) => {
    return (
      !!n.left ||
      !!n.right ||
      !!n.numerator ||
      !!n.denominator ||
      !!n.whole ||
      Array.isArray(n.args) ||
      !!n.arg
    );
  };

  const getChildren = (n: AstNode): { label: string; node: AstNode }[] => {
    const children: { label: string; node: AstNode }[] = [];
    if (n.left) children.push({ label: "left", node: n.left });
    if (n.right) children.push({ label: "right", node: n.right });
    if (n.numerator) {
      children.push({
        label: "numerator",
        node:
          typeof n.numerator === "object"
            ? n.numerator
            : { type: "val", value: n.numerator },
      });
    }
    if (n.denominator) {
      children.push({
        label: "denominator",
        node:
          typeof n.denominator === "object"
            ? n.denominator
            : { type: "val", value: n.denominator },
      });
    }
    if (n.whole) {
      children.push({
        label: "whole",
        node:
          typeof n.whole === "object"
            ? n.whole
            : { type: "val", value: n.whole },
      });
    }
    if (Array.isArray(n.args)) {
      n.args.forEach((child, i) =>
        children.push({ label: `arg[${i}]`, node: child }),
      );
    }
    if (n.arg) children.push({ label: "arg", node: n.arg });
    return children;
  };

  const nodeValue =
    node.value !== undefined
      ? node.value
      : node.op !== undefined
        ? node.op
        : node.name !== undefined
          ? node.name
          : "";

  const canExpand = hasChildren(node);

  return (
    <div className="ast-node">
      <div
        className="ast-node-header"
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
      >
        <span className="ast-toggle">
          {canExpand ? (isExpanded ? "▼" : "▶") : "•"}
        </span>
        <span className="node-type">{node.type}</span>
        {nodeValue !== "" && <span className="node-value">{nodeValue}</span>}
      </div>
      {canExpand && isExpanded && (
        <div className="ast-children">
          {getChildren(node).map((child, i) => (
            <div key={i} className="ast-child-row">
              <span className="ast-child-label">{child.label}:</span>
              <AstTreeView node={child.node} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AstTreeView;
