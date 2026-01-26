import React from "react";

interface Props {
  data: any;
}

const JsonView: React.FC<Props> = ({ data }) => {
  return <pre className="json-view">{JSON.stringify(data, null, 2)}</pre>;
};

export default JsonView;
