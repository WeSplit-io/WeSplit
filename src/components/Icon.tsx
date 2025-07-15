import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Bootstrap Icons imports - Using correct paths
import HouseFill from 'react-native-bootstrap-icons/icons/house-fill';
import House from 'react-native-bootstrap-icons/icons/house';
import PersonFill from 'react-native-bootstrap-icons/icons/person-fill';
import Person from 'react-native-bootstrap-icons/icons/person';
import PlusCircleFill from 'react-native-bootstrap-icons/icons/plus-circle-fill';
import Plus from 'react-native-bootstrap-icons/icons/plus';
import PlusLg from 'react-native-bootstrap-icons/icons/plus-lg';
import GearFill from 'react-native-bootstrap-icons/icons/gear-fill';
import Gear from 'react-native-bootstrap-icons/icons/gear';
import ArrowLeft from 'react-native-bootstrap-icons/icons/arrow-left';
import ArrowRight from 'react-native-bootstrap-icons/icons/arrow-right';
import ArrowUp from 'react-native-bootstrap-icons/icons/arrow-up';
import ArrowDown from 'react-native-bootstrap-icons/icons/arrow-down';
import ArrowUpShort from 'react-native-bootstrap-icons/icons/arrow-up-short';
import ArrowDownShort from 'react-native-bootstrap-icons/icons/arrow-down-short';
import People from 'react-native-bootstrap-icons/icons/people';
import PeopleFill from 'react-native-bootstrap-icons/icons/people-fill';
import Check from 'react-native-bootstrap-icons/icons/check';
import CheckCircle from 'react-native-bootstrap-icons/icons/check-circle';
import CheckCircleFill from 'react-native-bootstrap-icons/icons/check-circle-fill';
import XLg from 'react-native-bootstrap-icons/icons/x-lg';
import X from 'react-native-bootstrap-icons/icons/x';
import Grid from 'react-native-bootstrap-icons/icons/grid';
import Grid3x3 from 'react-native-bootstrap-icons/icons/grid-3x3';
import Square from 'react-native-bootstrap-icons/icons/square';
import Share from 'react-native-bootstrap-icons/icons/share';
import ShareFill from 'react-native-bootstrap-icons/icons/share-fill';
import Upload from 'react-native-bootstrap-icons/icons/upload';
import Download from 'react-native-bootstrap-icons/icons/download';
import Eye from 'react-native-bootstrap-icons/icons/eye';
import EyeSlash from 'react-native-bootstrap-icons/icons/eye-slash';
import EyeFill from 'react-native-bootstrap-icons/icons/eye-fill';
import Clipboard from 'react-native-bootstrap-icons/icons/clipboard';
import Link45deg from 'react-native-bootstrap-icons/icons/link-45deg';
import PencilSquare from 'react-native-bootstrap-icons/icons/pencil-square';
import Pencil from 'react-native-bootstrap-icons/icons/pencil';
import Trash from 'react-native-bootstrap-icons/icons/trash';
import TrashFill from 'react-native-bootstrap-icons/icons/trash-fill';
import Star from 'react-native-bootstrap-icons/icons/star';
import StarFill from 'react-native-bootstrap-icons/icons/star-fill';
import Wallet from 'react-native-bootstrap-icons/icons/wallet';
import WalletFill from 'react-native-bootstrap-icons/icons/wallet-fill';
import CreditCard from 'react-native-bootstrap-icons/icons/credit-card';
import BoxArrowRight from 'react-native-bootstrap-icons/icons/box-arrow-right';
import BoxArrowInRight from 'react-native-bootstrap-icons/icons/box-arrow-in-right';
import BoxArrowUp from 'react-native-bootstrap-icons/icons/box-arrow-up';
import BoxArrowDown from 'react-native-bootstrap-icons/icons/box-arrow-down';
import FileText from 'react-native-bootstrap-icons/icons/file-text';
import ChatDots from 'react-native-bootstrap-icons/icons/chat-dots';
import Telephone from 'react-native-bootstrap-icons/icons/telephone';
import EnvelopeFill from 'react-native-bootstrap-icons/icons/envelope-fill';
import Key from 'react-native-bootstrap-icons/icons/key';
import Shield from 'react-native-bootstrap-icons/icons/shield';
import ExclamationCircle from 'react-native-bootstrap-icons/icons/exclamation-circle';
import InfoCircle from 'react-native-bootstrap-icons/icons/info-circle';
import ChevronDown from 'react-native-bootstrap-icons/icons/chevron-down';
import ChevronUp from 'react-native-bootstrap-icons/icons/chevron-up';
import ChevronLeft from 'react-native-bootstrap-icons/icons/chevron-left';
import ChevronRight from 'react-native-bootstrap-icons/icons/chevron-right';
import HddStack from 'react-native-bootstrap-icons/icons/hdd-stack';
import Lightning from 'react-native-bootstrap-icons/icons/lightning';
import LightningFill from 'react-native-bootstrap-icons/icons/lightning-fill';
import Hash from 'react-native-bootstrap-icons/icons/hash';
import Circle from 'react-native-bootstrap-icons/icons/circle';
import ArrowUpRight from 'react-native-bootstrap-icons/icons/arrow-up-right';
import ArrowDownLeft from 'react-native-bootstrap-icons/icons/arrow-down-left';
import PersonPlus from 'react-native-bootstrap-icons/icons/person-plus';
import DollarSign from 'react-native-bootstrap-icons/icons/currency-dollar';
import Bell from 'react-native-bootstrap-icons/icons/bell';
import BellFill from 'react-native-bootstrap-icons/icons/bell-fill';
import Camera from 'react-native-bootstrap-icons/icons/camera';
import CameraFill from 'react-native-bootstrap-icons/icons/camera-fill';
import UpcScan from 'react-native-bootstrap-icons/icons/upc-scan';
import Upc from 'react-native-bootstrap-icons/icons/upc';

export type IconType = 'bootstrap' | 'ionicons' | 'fontawesome5';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  type?: IconType;
  style?: StyleProp<ViewStyle>;
}

// Icon mapping from current names to Bootstrap icon components
const iconMap: Record<string, React.ComponentType<any>> = {
  // Navigation
  'home': House,
  'house': HouseFill,
  'user': Person,
  'users': People,
  'people': People,
  'plus': Plus,
  'plus-lg': PlusLg,
  'settings': Gear,
  'gear': GearFill,
  'grid': Grid3x3,
  'grid-3x3': Grid3x3,
  
  // Arrows
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-up-right': ArrowUpRight,
  'arrow-down-left': ArrowDownLeft,
  'arrow-up-short': ArrowUpShort,
  'arrow-down-short': ArrowDownShort,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  
  // Actions
  'check': Check,
  'check-circle': CheckCircle,
  'check-circle-fill': CheckCircleFill,
  'x': X,
  'x-lg': XLg,
  'copy': Clipboard,
  'share': Share,
  'share-2': ShareFill,
  'send': Share, // Using share as fallback for send
  'send-fill': ShareFill,
  'upload': Upload,
  'download': Download,
  'link': Link45deg,
  
  // Edit/Modify
  'edit': PencilSquare,
  'edit-2': PencilSquare,
  'edit-3': PencilSquare,
  'pencil': Pencil,
  'pencil-square': PencilSquare,
  'trash': Trash,
  'trash-2': TrashFill,
  
  // View
  'eye': Eye,
  'eye-off': EyeSlash,
  'eye-fill': EyeFill,
  'qr-code': Upc, // Using UPC as QR code representation
  'qr-code-scan': UpcScan, // Using UPC scan for QR code scanner
  'camera': Camera,
  'camera-fill': CameraFill,
  
  // Finance/Wallet
  'wallet': Wallet,
  'wallet-fill': WalletFill,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  
  // Authentication & Actions
  'log-in': BoxArrowInRight,
  'log-out': BoxArrowRight,
  'box-arrow-up': BoxArrowUp,
  'box-arrow-down': BoxArrowDown,
  'key': Key,
  'shield': Shield,
  
  // Content
  'file-text': FileText,
  'message-circle': ChatDots,
  'smartphone': Telephone,
  'phone': Telephone,
  'mail': EnvelopeFill,
  'envelope': EnvelopeFill,
  
  // Status & Notifications
  'star': Star,
  'star-fill': StarFill,
  'alert-circle': ExclamationCircle,
  'exclamation-circle': ExclamationCircle,
  'info': InfoCircle,
  'info-circle': InfoCircle,
  'loader': Circle,
  'bell': Bell,
  'bell-fill': BellFill,
  
  // Data
  'database': HddStack, // Using HDD stack as database representation
  'zap': Lightning,
  'lightning': LightningFill,
  'hash': Hash,
  
  // User management
  'user-plus': PersonPlus,
  'person-plus': PersonPlus,
  'plus-circle': PlusCircleFill,
  'plus-circle-fill': PlusCircleFill,
  
  // Map Pin (using info circle as fallback)
  'map-pin': InfoCircle,
  
  // Default fallback
  'circle': Circle,
};

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#333', type = 'bootstrap', style }) => {
  // Handle QR code icons with react-native-vector-icons
  if (name === 'qr-code' || name === 'qr-code-scan') {
    if (type === 'ionicons' || name === 'qr-code-scan') {
      return (
        <Ionicons 
          name={name === 'qr-code' ? 'qr-code' : 'qr-code-outline'} 
          size={size} 
          color={color} 
          style={style} 
        />
      );
    } else if (type === 'fontawesome5') {
      return (
        <FontAwesome5 
          name="qrcode" 
          size={size} 
          color={color} 
          style={style} 
        />
      );
    }
  }

  // Handle other icons with Bootstrap icons
  const IconComponent = iconMap[name] || Circle; // Default to circle if icon not found
  
  return (
    <IconComponent 
      width={size} 
      height={size} 
      fill={color} 
      style={style} 
    />
  );
};

export default Icon; 