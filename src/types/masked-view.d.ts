declare module '@react-native-masked-view/masked-view' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface MaskedViewProps extends ViewProps {
    maskElement: React.ReactElement<any>;
    children?: React.ReactNode;
  }

  export default class MaskedView extends React.Component<MaskedViewProps> {}
}


