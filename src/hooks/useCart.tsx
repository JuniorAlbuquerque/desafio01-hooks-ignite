import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}


interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: { amount } } = await api.get<Stock>(`/stock/${productId}`);
      const { data: product } = await api.get<Product>(`/products/${productId}`);
      
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(product => product.id === productId);

      if (productIndex !== -1) {
        const productCartAmount = updateCart[productIndex].amount;

        if (productCartAmount >= amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updateCart[productIndex].amount += 1;
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

        return;
      }

      updateCart.push({...product, amount: 1});
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      setCart(updateCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(product => product.id === productId);

      if (productIndex !== -1) {
        updateCart.splice(productIndex, 1);
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

        return;
      }

      throw new Error('Erro na remoção do produto');
    } catch(error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) return;

      const { data } = await api.get<Stock>(`/stock/${productId}`);
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(product => product.id === productId);

      if (amount > data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      updateCart[productIndex].amount = amount;

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
