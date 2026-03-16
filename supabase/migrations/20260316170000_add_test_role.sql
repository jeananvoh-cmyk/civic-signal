-- Ajoute le rôle "test" à l'enum app_role
-- Permet aux admins de nommer des comptes test qui bypassent les contraintes de profil
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'test';
