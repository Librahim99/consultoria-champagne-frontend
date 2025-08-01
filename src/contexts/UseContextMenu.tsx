import { useContext } from 'react';
import { ContextMenuContext } from './ContextMenuProvider';

export const useContextMenu = () => useContext(ContextMenuContext);